import Modal from '@/Components/Modal';
import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';

export default function ChangelogModal() {
    const { flash } = usePage<any>().props;
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // If flash.show_changelog is true, show the modal
        if (flash?.show_changelog) {
            setIsOpen(true);
        }
    }, [flash]);

    const closeModal = () => {
        setIsOpen(false);
        window.dispatchEvent(new Event('changelog_closed'));
    };

    return (
        <Modal show={isOpen} onClose={closeModal} maxWidth="2xl">
            <div className="p-6">
                <div className="flex items-center justify-between mb-5 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                        Informasi Rilis
                    </h2>
                    <span className="bg-indigo-100 text-indigo-800 text-sm font-semibold px-3 py-1 rounded-full dark:bg-indigo-900 dark:text-indigo-300">
                        SIKAS V.2026.14
                    </span>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Pembaharuan Section */}
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30">
                        <h3 className="text-base font-bold text-green-800 dark:text-green-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Pembaharuan
                        </h3>
                        <ul className="list-disc pl-6 text-sm text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
                            <li><span className="font-medium">Penambahan Rekapitulasi Barang Habis Pakai (BHP):</span> Penambahan format Rekapitulasi Belanja Dana BOSP (Barang Habis Pakai)</li>
                            <li><span className="font-medium">Penambahan Rekapitulasi Belanja Dana BOSP (Barang Modal / Aset):</span> Penambahan format Rekapitulasi Belanja Dana BOSP (Barang Modal / Aset)</li>
                            <li><span className="font-medium">Penambahan Format Kwitan 3:</span> Penambahan format kwitansi pembayaran pada fitur kwitansi</li>
                        </ul>
                    </div>

                    {/* Perbaikan Section */}
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800/30">
                        <h3 className="text-base font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            Perbaikan
                        </h3>
                        <ul className="list-disc pl-6 text-sm text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
                            <li><span className="font-medium">Perbaikan Bug Error 500:</span> Perbaikan Bug Error 500 saat melakukan instalasi aplikasi. </li>
                            <li><span className="font-medium">Perbaikan BKU:</span> Perbaikan sistem pajak pada Buku Kas Umum (BKU) saat melakukan keterlambatan Setor Pajak </li>
                            <li><span className="font-medium">Perbaikan BKP Pajak:</span> Perbaikan Buku Kas Pajak yang tidak menampilkan saldo awal pada saat melakukan setor pajak </li>
                            <li><span className="font-medium">Perbaikan Tambah Pembelanjaan RKAS dan Perubahan:</span> Perbaikan bug pada form kegiatan dan rekening belanja saat tambah belanja pada rkas dan rkas perubahan yang melakukan sisip uraian sebelunya </li>
                            <li><span className="font-medium">Perbaikan Form bulan pada Rkas dan Rkas Perubahan:</span> Perbaikanbug pada form bulan pada rkas dan rkas perubahan saat bulan sudah terpilih maka tidak akan tampil lagi pada pilihan bulan. </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 text-right">
                    <button
                        onClick={closeModal}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors duration-200"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </Modal>
    );
}
