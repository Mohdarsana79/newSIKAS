/** Config Tailwind khusus untuk preview desain statis di docs/ui-redesign/preview */
module.exports = {
    content: ['./docs/ui-redesign/preview/*.html'],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                canvas: '#F4F5FA',
                ink: {
                    50: '#F5F5FA',
                    100: '#ECECF3',
                    200: '#D9D9E6',
                    300: '#B9B8CC',
                    400: '#8E8DA6',
                    500: '#6B6A82',
                    600: '#4A495C',
                    700: '#333244',
                    800: '#262536',
                    900: '#1E1D2E',
                    950: '#14131F',
                },
                lime: {
                    100: '#F8FDE8',
                    200: '#F0FBCB',
                    300: '#E5F7A3',
                    400: '#D8F275',
                    500: '#C5E84E',
                    600: '#A9CE2F',
                    700: '#83A122',
                },
                brand: {
                    200: '#E4DCFF',
                    300: '#C9BCFF',
                    400: '#A38CFF',
                    500: '#7C5CFF',
                    600: '#5B3DF5',
                    700: '#4527C9',
                },
                pastel: {
                    peach: '#FFE9DC',
                    mint: '#E4F8EE',
                    sky: '#E7F0FF',
                    rose: '#FFE7E9',
                    amber: '#FFF4D6',
                    lavender: '#EFEAFF',
                },
                peach: '#F47B45',
                mint: '#10B981',
                sky: '#3B82F6',
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
                '6xl': '3rem',
            },
            boxShadow: {
                card: '0 18px 45px -28px rgba(20,19,31,0.35)',
                'card-hover': '0 28px 60px -30px rgba(20,19,31,0.45)',
                float: '0 30px 60px -30px rgba(9,9,20,0.55)',
                lime: '0 12px 30px -12px rgba(197,232,78,0.75)',
                nav: '0 10px 30px -18px rgba(15,23,42,0.25)',
                pill: '0 6px 18px -10px rgba(20,19,31,0.4)',
            },
            keyframes: {
                rise: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'float-slow': {
                    '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                    '50%': { transform: 'translateY(-14px) rotate(2deg)' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
                    '50%': { opacity: '1', transform: 'scale(1.08)' },
                },
                'grow-bar': {
                    '0%': { transform: 'scaleY(0)' },
                    '100%': { transform: 'scaleY(1)' },
                },
                'slide-in': {
                    '0%': { opacity: '0', transform: 'translateX(14px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
            },
            animation: {
                rise: 'rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
                float: 'float 7s ease-in-out infinite',
                'float-slow': 'float-slow 11s ease-in-out infinite',
                shimmer: 'shimmer 1.6s ease-in-out infinite',
                'pulse-soft': 'pulse-soft 4.5s ease-in-out infinite',
                'grow-bar': 'grow-bar 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
                'slide-in': 'slide-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
            },
        },
    },
    plugins: [],
};
