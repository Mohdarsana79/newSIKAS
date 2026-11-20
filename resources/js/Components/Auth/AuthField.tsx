import { cn } from '@/lib/utils';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
    id: string;
    label: string;
    icon?: ReactNode;
    trailing?: ReactNode;
    error?: string;
    hint?: ReactNode;
    labelExtra?: ReactNode;
    fieldClassName?: string;
};

/**
 * Field auth dengan ikon, label, dan pesan galat bernuansa Ice-White & Teal.
 * Props input (name, value, onChange, autoComplete, ref, dll.) diteruskan apa adanya.
 */
const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
    {
        id,
        label,
        icon,
        trailing,
        error,
        hint,
        labelExtra,
        fieldClassName,
        className,
        required,
        ...props
    },
    ref,
) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

    return (
        <div className={cn('group', fieldClassName)}>
            <div className="flex items-baseline justify-between gap-3">
                <label
                    htmlFor={inputId}
                    className="text-[12.5px] font-semibold tracking-[0.005em] text-[#1A434D] transition-colors duration-200 group-focus-within:text-[#0E5862]"
                >
                    {label}
                    {required && (
                        <span aria-hidden="true" className="ml-1 text-[#C44536]">
                            *
                        </span>
                    )}
                </label>
                {labelExtra}
            </div>

            <div className="relative mt-1.5">
                {icon && (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-0 flex h-full w-11 items-center justify-center text-[#5A7B84] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within:scale-110 group-focus-within:text-[#146670]"
                    >
                        {icon}
                    </span>
                )}

                <input
                    {...props}
                    ref={ref}
                    id={inputId}
                    required={required}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={cn(
                        'auth-input peer h-[52px] w-full rounded-[14px] border bg-[#F8FBFB] text-[14.5px] font-medium text-[#08222B]',
                        'shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none',
                        'transition-[border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                        'placeholder:font-normal placeholder:text-[#6E8B93]',
                        icon ? 'pl-11' : 'pl-4',
                        trailing ? 'pr-[52px]' : 'pr-4',
                        error
                            ? 'border-[#D96A4E] bg-[#FFF8F6] focus:border-[#D96A4E] focus:ring-4 focus:ring-[#D96A4E]/[0.14]'
                            : 'border-[#CBE2E2] hover:border-[#98CBCB] focus:border-[#146670] focus:bg-white focus:ring-4 focus:ring-[#8BE6DC]/35',
                        className,
                    )}
                />

                {trailing && (
                    <div className="absolute right-1.5 top-0 flex h-full items-center">{trailing}</div>
                )}
            </div>

            {error ? (
                <p
                    id={errorId}
                    className="auth-shake mt-1.5 flex items-start gap-1.5 text-[12px] font-medium leading-snug text-[#B83E2B]"
                >
                    <AlertCircle aria-hidden="true" className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                </p>
            ) : hint ? (
                <p id={hintId} className="mt-1.5 text-[11.5px] leading-snug text-[#5A7882]">
                    {hint}
                </p>
            ) : null}
        </div>
    );
});

export function AuthPasswordToggle({
    shown,
    onToggle,
    showLabel = 'Tampilkan password',
    hideLabel = 'Sembunyikan password',
}: {
    shown: boolean;
    onToggle: () => void;
    showLabel?: string;
    hideLabel?: string;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={shown ? hideLabel : showLabel}
            aria-pressed={shown}
            className="mr-1 flex h-9 w-9 items-center justify-center rounded-[10px] text-[#5A7B84] transition-colors duration-200 hover:bg-[#EAF4F4] hover:text-[#146670] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BE6DC]"
        >
            {shown ? (
                <EyeOff className="h-[17px] w-[17px]" strokeWidth={1.7} aria-hidden="true" />
            ) : (
                <Eye className="h-[17px] w-[17px]" strokeWidth={1.7} aria-hidden="true" />
            )}
        </button>
    );
}

export default AuthField;
