import { useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import { usePage } from '@inertiajs/react';

export default function Toast() {
    const { flash } = usePage().props as any;
    const [show, setShow] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        if (flash?.success) {
            setMessage(flash.success);
            setType('success');
            setShow(true);
            setTimeout(() => setShow(false), 3000);
        } else if (flash?.error) {
            setMessage(flash.error);
            setType('error');
            setShow(true);
            setTimeout(() => setShow(false), 3000);
        }

        const handleExposeToast = (event: CustomEvent) => {
            setMessage(event.detail.message);
            setType(event.detail.type || 'success');
            setShow(true);
            setTimeout(() => setShow(false), 3000);
        };

        window.addEventListener('toast-notification' as any, handleExposeToast);

        return () => {
            window.removeEventListener('toast-notification' as any, handleExposeToast);
        };
    }, [flash]);

    const isSuccess = type === 'success';

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-[60]">
            <Transition
                show={show}
                enter="transition ease-out duration-300"
                enterFrom="transform opacity-0 translate-x-4 scale-95"
                enterTo="transform opacity-100 translate-x-0 scale-100"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 translate-x-0 scale-100"
                leaveTo="transform opacity-0 translate-x-4 scale-95"
            >
                <div
                    className="pointer-events-auto flex w-full max-w-xs items-start gap-2.5 rounded-2xl border border-white bg-white p-3 shadow-float dark:border-white/10 dark:bg-[#15131F]"
                    role="alert"
                >
                    <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            isSuccess
                                ? 'bg-lime-400 text-slate-950'
                                : 'bg-rose-500 text-white'
                        }`}
                    >
                        {isSuccess ? (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6 9 17l-5-5" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 9v4M12 17h.01" />
                                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                            </svg>
                        )}
                    </span>

                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-extrabold text-slate-900 dark:text-white">
                            {isSuccess ? 'Berhasil' : 'Terjadi kesalahan'}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                            {message}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                        onClick={() => setShow(false)}
                        aria-label="Tutup notifikasi"
                    >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </Transition>
        </div>
    );
}
