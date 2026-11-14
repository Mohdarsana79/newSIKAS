export interface SelectOption {
    value: string;
    label: string;
}

export const BAST_SELECT_CLASS_NAMES = {
    container: () => 'relative',
    control: ({ isFocused }: { isFocused: boolean }) =>
        [
            'min-h-[42px] cursor-pointer rounded-2xl border bg-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition dark:bg-white/5',
            isFocused
                ? 'border-lime-400 ring-4 ring-lime-200/60 dark:border-lime-400/70 dark:ring-lime-400/10'
                : 'border-slate-200/90 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20',
        ].join(' '),
    valueContainer: () => 'gap-1 py-0.5',
    placeholder: () => 'text-xs font-medium text-slate-400 dark:text-slate-500',
    singleValue: () => 'text-xs font-bold text-slate-900 dark:text-white',
    input: () =>
        'text-xs font-semibold text-slate-900 dark:text-white [&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!shadow-none',
    indicatorsContainer: () => 'gap-1.5 pl-2',
    indicatorSeparator: () => 'my-1.5 w-px bg-slate-200 dark:bg-white/10',
    dropdownIndicator: () =>
        'cursor-pointer rounded-lg p-0.5 text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-white',
    menu: () =>
        'z-[9999] mt-1.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-float dark:border-white/10 dark:bg-[#1A1728]',
    menuList: () => 'sikas-scroll max-h-52 space-y-0.5 overflow-y-auto',
    option: ({ isSelected, isFocused }: { isSelected: boolean; isFocused: boolean }) =>
        [
            'cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition',
            isSelected
                ? 'bg-pastel-lavender/85 text-brand-800 dark:bg-brand-500/25 dark:text-brand-200'
                : isFocused
                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                  : 'text-slate-700 dark:text-slate-300',
        ].join(' '),
    noOptionsMessage: () => 'px-3 py-3 text-center text-xs text-slate-400 dark:text-slate-500',
};
