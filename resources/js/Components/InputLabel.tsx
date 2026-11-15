import { LabelHTMLAttributes } from 'react';

export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { value?: string, required?: boolean }) {
    return (
        <label
            {...props}
            className={
                `mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 ` +
                className
            }
        >
            {value ? value : children}
            {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
    );
}
