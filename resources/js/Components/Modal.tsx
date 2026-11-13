import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose = () => { },
    panelClassName,
    overlayClassName,
    ariaLabelledBy,
    ariaDescribedBy,
}: PropsWithChildren<{
    show: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
    closeable?: boolean;
    onClose: CallableFunction;
    /** Kelas tambahan untuk panel dialog (mis. sudut/aksen halaman auth). */
    panelClassName?: string;
    /** Kelas tambahan untuk lapisan latar dialog. */
    overlayClassName?: string;
    /** id elemen judul dialog, untuk pembaca layar. */
    ariaLabelledBy?: string;
    /** id elemen deskripsi dialog, untuk pembaca layar. */
    ariaDescribedBy?: string;
}>) {
    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
        '3xl': 'sm:max-w-3xl',
        '4xl': 'sm:max-w-4xl',
        '5xl': 'sm:max-w-5xl',
        '6xl': 'sm:max-w-6xl',
        '7xl': 'sm:max-w-7xl',
    }[maxWidth];

    return (
        <Transition show={show} leave="duration-200">
            <Dialog
                as="div"
                id="modal"
                aria-labelledby={ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
                className="fixed inset-0 z-50 overflow-y-auto transition-all"
                onClose={close}
            >
                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className={cn('fixed inset-0 backdrop-blur-sm', overlayClassName ?? 'bg-slate-950/50')} />
                </TransitionChild>

                <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                    <TransitionChild
                        as="div"
                        className="w-full"
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-[0.97]"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-[0.97]"
                    >
                        <DialogPanel
                            className={cn(
                                'mx-auto transform overflow-visible rounded-[26px] border border-white/70 bg-white shadow-float transition-all dark:border-white/10 dark:bg-[#15131F] sm:w-full',
                                maxWidthClass,
                                panelClassName,
                            )}
                        >
                            {children}
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
}
