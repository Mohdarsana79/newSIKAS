import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import CurrencyInput from '@/Components/CurrencyInput';
import DatePicker from '@/Components/DatePicker'; // Assuming you have this or use standard input type="date"
import IconTile from '@/Components/ui/IconTile';
import axios from 'axios';
import { useForm } from '@inertiajs/react';
import useVariantRoute from '@/Hooks/useVariantRoute';

interface TrkSaldoAwalModalProps {
    show: boolean;
    onClose: () => void;
    tahun: string;
    onSuccess: () => void;
}

export default function TrkSaldoAwalModal({ show, onClose, tahun, onSuccess }: TrkSaldoAwalModalProps) {
    const vroute = useVariantRoute();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Local state for form fields
    const [isTrk, setIsTrk] = useState(false);
    const [tanggal, setTanggal] = useState('');
    const [jumlah, setJumlah] = useState('');

    useEffect(() => {
        if (show && tahun) {
            fetchData();
        }
    }, [show, tahun]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(vroute('api.bku.trk-saldo-awal.get', tahun));
            if (response.data.success) {
                const data = response.data.data;
                setIsTrk(data.is_trk_saldo_awal);
                setTanggal(data.tanggal_trk_saldo_awal || '');
                // Format amount if exists, or keep empty
                setJumlah(data.jumlah_trk_saldo_awal ? data.jumlah_trk_saldo_awal.toString() : '');
            }
        } catch (error) {
            console.error("Error validasi trk saldo awal:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.post(vroute('api.bku.trk-saldo-awal.save'), {
                tahun: tahun,
                is_trk_saldo_awal: isTrk,
                tanggal_trk_saldo_awal: isTrk ? tanggal : null,
                jumlah_trk_saldo_awal: isTrk ? parseFloat(jumlah) : null
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving TRK Saldo Awal:", error);
            alert("Gagal menyimpan data.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
                <div className="relative flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <IconTile tone="violet" size="md">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3v18h18" />
                            <path d="M7 15v2M11 11v6M15 8v9M19 5v12" />
                        </svg>
                    </IconTile>
                    <div>
                        <h2 className="text-[14px] font-extrabold text-slate-900 dark:text-white">
                            TRK Saldo Awal (Tahun {tahun})
                        </h2>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Tandai jika saldo awal sudah pernah ditarik / SiLPA sudah digunakan.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 dark:border-white/5 dark:bg-white/[0.02]">
                        <input
                            id="is_trk"
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-lime-500 shadow-sm focus:ring-lime-400 dark:border-white/20 dark:bg-white/5"
                            checked={isTrk}
                            onChange={(e) => setIsTrk(e.target.checked)}
                        />
                        <span className="text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                            Apakah saldo awal sudah pernah ditarik / SILPA sudah digunakan?
                            <span className="mt-0.5 block text-[9.5px] font-medium text-slate-400 dark:text-slate-500">Centang jika ya.</span>
                        </span>
                    </label>

                    {isTrk && (
                        <>
                            <div>
                                <InputLabel htmlFor="tanggal" value="Tanggal Penarikan" />
                                <DatePicker
                                    id="tanggal"
                                    value={tanggal}
                                    onChange={(date) => {
                                        if (date) {
                                            // Ensure date is set as YYYY-MM-DD string as backend expects
                                            // DatePicker onChange gives Date object.
                                            // We need to keep our state as string or Date?
                                            // Current code uses string. Let's convert.
                                            // Or better, let's keep it consistent.
                                            // The backend sends YYYY-MM-DD string.
                                            // The DatePicker expects value as Date | string.

                                            // Helper to format Date to YYYY-MM-DD
                                            const offset = date.getTimezoneOffset();
                                            const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
                                            setTanggal(adjustedDate.toISOString().split('T')[0]);
                                        } else {
                                            setTanggal('');
                                        }
                                    }}
                                    className="mt-1 block w-full"
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="jumlah" value="Jumlah Penarikan (Rp)" />
                                <CurrencyInput
                                    id="jumlah"
                                    name="jumlah_penarikan"
                                    value={jumlah}
                                    onValueChange={(value: string) => setJumlah(value)}
                                    placeholder="Masukkan jumlah"
                                    className="mt-1 block w-full"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                        <SecondaryButton onClick={onClose}>Batal</SecondaryButton>
                        <PrimaryButton onClick={handleSave} disabled={isSaving || isLoading}>
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </PrimaryButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
