import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import CurrencyInput from '@/Components/CurrencyInput';
import DatePicker from '@/Components/DatePicker'; // Assuming you have this or use standard input type="date"
import axios from 'axios';
import { useForm } from '@inertiajs/react';

interface TrkSaldoAwalModalProps {
    show: boolean;
    onClose: () => void;
    tahun: string;
    onSuccess: () => void;
}

export default function TrkSaldoAwalModal({ show, onClose, tahun, onSuccess }: TrkSaldoAwalModalProps) {
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
            const response = await axios.get(route('api.bku.trk-saldo-awal.get', tahun));
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
            await axios.post(route('api.bku.trk-saldo-awal.save'), {
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
            <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    TRK Saldo Awal (Tahun {tahun})
                </h2>

                <div className="space-y-4">
                    <div className="flex items-start">
                        <div className="flex items-center h-5">
                            <input
                                id="is_trk"
                                type="checkbox"
                                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                checked={isTrk}
                                onChange={(e) => setIsTrk(e.target.checked)}
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="is_trk" className="font-medium text-gray-700 dark:text-gray-300">
                                Apakah saldo awal sudah pernah ditarik / SILPA sudah digunakan?
                            </label>
                            <p className="text-gray-500 dark:text-gray-400">Centang jika ya.</p>
                        </div>
                    </div>

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
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <SecondaryButton onClick={onClose}>Batal</SecondaryButton>
                    <PrimaryButton onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
