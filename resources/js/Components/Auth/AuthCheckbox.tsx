import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { InputHTMLAttributes, ReactNode } from 'react';

/**
 * Kotak centang kustom bernuansa Teal & Mint Aqua.
 * Input asli tetap dipakai supaya label, keyboard, dan status checked tetap ditangani browser.
 */
export default function AuthCheckbox({
    label,
    className,
    ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
    return (
        <label className={cn('group inline-flex cursor-pointer select-none items-center gap-2.5', className)}>
            <span className="relative flex h-[19px] w-[19px] items-center justify-center">
                <input
                    {...props}
                    type="checkbox"
                    className="peer absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-[6px] border border-[#BBD8D8] bg-[#F8FBFB] transition-all duration-200 checked:border-[#146670] checked:bg-[#146670] hover:border-[#7BB8B8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8BE6DC]/45"
                />
                <Check
                    aria-hidden="true"
                    strokeWidth={3.4}
                    className="pointer-events-none relative z-20 h-[11px] w-[11px] scale-50 text-[#9DF0E7] opacity-0 transition-all duration-200 peer-checked:scale-100 peer-checked:opacity-100"
                />
            </span>
            <span className="text-[12.5px] font-medium text-[#45636D] transition-colors duration-200 group-hover:text-[#08222B]">
                {label}
            </span>
        </label>
    );
}
