import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import StatusBadge from '@/Components/ui/StatusBadge';
import {
    resolveSpjCustomFormVariables,
    SpjCustomTemplate,
} from '@/Components/SpjCustomTemplate/types';
import { LaporanSectionCard } from './LaporanModalPrimitives';

interface LaporanCustomVariablesSectionProps {
    docLabel: string;
    templates: SpjCustomTemplate[];
    activeTemplate: SpjCustomTemplate | null;
    values: Record<string, string>;
    onChange: (next: Record<string, string>) => void;
}

const TEXTAREA_CLASS =
    'mt-1 block w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-lime-400 focus:outline-none focus:ring-4 focus:ring-lime-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-lime-400/70 dark:focus:ring-lime-400/10';

export default function LaporanCustomVariablesSection({
    docLabel,
    templates,
    activeTemplate,
    values,
    onChange,
}: LaporanCustomVariablesSectionProps) {
    const fields = useMemo(
        () => resolveSpjCustomFormVariables(templates, activeTemplate),
        [templates, activeTemplate],
    );

    if (fields.length === 0) {
        return null;
    }

    return (
        <LaporanSectionCard
            title="Variabel Tambahan (Template Kustom)"
            tone="violet"
            icon={<Sparkles className="h-3.5 w-3.5" />}
            headerAction={
                <StatusBadge tone="info" dot={false}>
                    {fields.length} tag kustom
                </StatusBadge>
            }
        >
            <p className="mb-3 text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                {activeTemplate
                    ? `Kolom otomatis dari tag kustom pada template "${activeTemplate.nama}".`
                    : `Kolom otomatis dari tag kustom yang terdeteksi pada template ${docLabel} Anda.`}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {fields.map((field) => (
                    <div
                        key={field.key}
                        className={field.isLongText ? 'md:col-span-2' : ''}
                    >
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                            <InputLabel value={field.label} />
                            <div className="flex items-center gap-1.5">
                                {!activeTemplate && field.templateNames.length > 0 && (
                                    <span className="truncate text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">
                                        {field.templateNames.join(', ')}
                                    </span>
                                )}
                                <code className="rounded-md border border-brand-200/70 bg-brand-50/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-700 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300">
                                    {field.tag}
                                </code>
                            </div>
                        </div>

                        {field.isLongText ? (
                            <textarea
                                className={TEXTAREA_CLASS}
                                rows={2}
                                placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                                value={values[field.key] ?? ''}
                                onChange={(e) =>
                                    onChange({
                                        ...values,
                                        [field.key]: e.target.value,
                                    })
                                }
                            />
                        ) : (
                            <TextInput
                                type="text"
                                placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                                value={values[field.key] ?? ''}
                                onChange={(e) =>
                                    onChange({
                                        ...values,
                                        [field.key]: e.target.value,
                                    })
                                }
                            />
                        )}
                    </div>
                ))}
            </div>
        </LaporanSectionCard>
    );
}
