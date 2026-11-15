import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded-md border-slate-300 text-lime-500 shadow-sm focus:ring-lime-400 dark:border-white/20 dark:bg-white/5 ' +
                className
            }
        />
    );
}
