import React from 'react';
import Modal from '@/Components/Modal';
import IconTile from '@/Components/ui/IconTile';
import SecondaryButton from '@/Components/SecondaryButton';
import { BookOpen, X } from 'lucide-react';
import TagReferenceCatalog from './TagReferenceCatalog';
import { SkTagGroup } from './types';

interface Props {
    show: boolean;
    onClose: () => void;
    catalog: SkTagGroup[];
}

export default function TagReferenceModal({ show, onClose, catalog = [] }: Props) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="full">
            <div className="relative flex h-screen flex-col overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/[0.08]" />

                {/* Header */}
                <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                    <div className="flex min-w-0 items-center gap-3">
                        <IconTile tone="sky" size="lg">
                            <BookOpen className="h-4 w-4" />
                        </IconTile>
                        <div className="min-w-0">
                            <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Referensi Tag newSIKAS
                            </h3>
                            <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                Daftar lengkap referensi tag data sekolah, penganggaran BOSP, belanja BKU, penerimaan dana, PTK, gambar kop/logo, &amp; tabel baris dinamis.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup modal referensi tag"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="relative flex-1 overflow-y-auto px-6 py-5">
                    <div className="mx-auto max-w-7xl">
                        <TagReferenceCatalog catalog={catalog} />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center justify-end border-t border-slate-100 px-6 py-3.5 dark:border-white/5">
                    <SecondaryButton type="button" onClick={onClose}>
                        Tutup Referensi
                    </SecondaryButton>
                </div>
            </div>
        </Modal>
    );
}
