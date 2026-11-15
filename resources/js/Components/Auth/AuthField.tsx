import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
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
 * Field auth dengan ikon, label, dan pesan galat yang terhubung ke input.
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
                    className="text-[12.5px] font-semibold tracking-[0.005em] text-[#4A4257] transition-colors duration-200 group-focus-within:text-[#4A2FB0]"
                >
                    {label}
                    {required && (
                        <span aria-hidden="true" className="ml-1 text-[#B3462C]">
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
                        className="pointer-events-none absolute left-0 top-0 flex h-full w-11 items-center justify-center text-[#857A93] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within:scale-110 group-focus-within:text-[#6D4DE0]"
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
                        'auth-input peer h-[52px] w-full rounded-[14px] border bg-[#FFFCF5] text-[14.5px] font-medium text-[#221C33]',
                        'shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none',
                        'transition-[border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                        'placeholder:font-normal placeholder:text-[#786E85]',
                        icon ? 'pl-11' : 'pl-4',
                        trailing ? 'pr-[52px]' : 'pr-4',
                        error
                            ? 'border-[#D96A4E] bg-[#FFF9F5] focus:border-[#D96A4E] focus:ring-4 focus:ring-[#D96A4E]/[0.12]'
                            : 'border-[#E3D9C9] hover:border-[#CFC2AC] focus:border-[#6D4DE0] focus:ring-4 focus:ring-[#6D4DE0]/[0.14]',
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
                    className="auth-shake mt-1.5 flex items-start gap-1.5 text-[12px] font-medium leading-snug text-[#B3462C]"
                >
                    <AlertCircle aria-hidden="true" className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                </p>
            ) : hint ? (
                <p id={hintId} className="mt-1.5 text-[11.5px] leading-snug text-[#7A7085]">
                    {hint}
                </p>
            ) : null}
        </div>
    );
});

export default AuthField;
