import { HTMLAttributes } from 'react';

export default function InputError({
    message,
    className = '',
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p
            {...props}
            className={'text-[10px] font-semibold text-rose-500 ' + className}
        >
            {message}
        </p>
    ) : null;
}
