import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
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
        <section className={`space-y-6 ${className}`}>
            <header className="mb-6 border-b pb-4 border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    Keamanan Akun
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Kelola keamanan tambahan untuk akun Anda. Aktifkan fitur ini untuk menambahkan lapisan perlindungan saat login.
                </p>
            </header>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                    {isEnabled ? (
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <Lock className="w-5 h-5" />
                        </div>
                    ) : (
                        <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-500">
                            <Unlock className="w-5 h-5" />
                        </div>
                    )}
                    <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            Kode Keamanan Login
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isEnabled
                                ? "Fitur aktif. Anda akan diminta memasukkan kode saat login."
                                : "Fitur nonaktif. Login hanya menggunakan password."}
                        </p>
                    </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isEnabled}
                        onChange={handleToggle}
                        disabled={toggleProcessing}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
            </div>

            {/* Generate Button (Only visible if enabled) */}
            {isEnabled && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Generate kode keamanan baru untuk login. Kode ini harus Anda simpan dan masukkan saat login.
                        </div>
                        <PrimaryButton onClick={handleGenerateClick} className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Generate Kode
                        </PrimaryButton>
                    </div>
                </div>
            )}

            {/* Modal for Generation */}
            <Modal show={showCodeModal} onClose={closeCodeModal}>
                <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        Generate Kode Aktivasi Login
                    </h2>

                    {!generatedCode ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Sistem akan membuat 6 digit angka acak sebagai kode keamanan Anda. Kode sebelumnya (jika ada) akan diganti.
                            </p>
                            <div className="flex justify-end gap-3 mt-6">
                                <SecondaryButton onClick={closeCodeModal}>
                                    Batal
                                </SecondaryButton>
                                <PrimaryButton onClick={generateCode} disabled={processing}>
                                    {processing ? 'Memproses...' : 'Generate Sekarang'}
                                </PrimaryButton>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 text-center">
                            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-2">
                                    KODE KEAMANAN ANDA
                                </p>
                                <div className="text-4xl font-mono font-bold text-indigo-700 dark:text-indigo-300 tracking-[0.2em]">
                                    {generatedCode}
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Harap simpan kode ini. Anda akan membutuhkannya saat login berikutnya.
                            </p>

                            <div className="flex justify-center mt-6">
                                <SecondaryButton onClick={closeCodeModal} className="w-full justify-center">
                                    Tutup & Simpan
                                </SecondaryButton>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </section>
    );
}
