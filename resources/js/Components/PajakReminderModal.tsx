import React from 'react';
import Modal from '@/Components/Modal';

interface PajakReminderModalProps {
    show: boolean;
    onClose: () => void;
}

export default function PajakReminderModal({ show, onClose }: PajakReminderModalProps) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="relative overflow-hidden bg-white/95 backdrop-blur-xl dark:bg-gray-900/95 shadow-2xl">
                
                {/* Decorative glowing background blobs */}
                <div className="absolute -top-24 -right-24 w-56 h-56 bg-red-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

                {/* Subtle top gradient line */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500"></div>

                <div className="relative px-6 pt-10 pb-10 text-center sm:px-10">
                    {/* Animated glowing icon container */}
                    <div className="relative mx-auto w-24 h-24 mb-6">
                        {/* Outer pulsing rings */}
                        <div className="absolute inset-0 rounded-full border-2 border-red-500/40 animate-ping" style={{ animationDuration: '3s' }}></div>
                        <div className="absolute inset-2 rounded-full border border-red-500/60 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
                        
                        {/* Inner glowing circle */}
                        <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/40 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-200 dark:border-red-700/50">
                            <svg className="w-10 h-10 text-red-600 dark:text-red-400 drop-shadow-md animate-bounce" style={{ animationDuration: '2s' }} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    
                    <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-3" id="modal-title">
                        Pajak Belum Dibayar!
                    </h3>
                    
                    <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 mb-8 max-w-sm mx-auto">
                        Sistem mendeteksi adanya <span className="font-semibold text-red-600 dark:text-red-400">tunggakan pajak</span> pada bulan ini. Harap periksa notifikasi Anda dan segera lakukan pembayaran.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row sm:justify-center">
                        <button
                            type="button"
                            onClick={onClose}
                            className="group relative inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 ease-in-out transform bg-gradient-to-r from-red-600 to-rose-600 rounded-xl hover:from-red-500 hover:to-rose-500 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(225,29,72,0.6)] focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 w-full sm:w-auto"
                        >
                            <span>Mengerti, Tutup</span>
                            <svg className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
