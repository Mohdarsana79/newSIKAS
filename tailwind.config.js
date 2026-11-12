import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class', // Changed to 'class' for manual toggling or system pref if handled
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
                // Hanya dipakai oleh landing page (resources/js/Components/Landing/*).
                display: ['Fraunces', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
                landing: ['"Plus Jakarta Sans"', 'Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                // === Token landing page (aditif, tidak dipakai halaman lain) ===
                ink: {
                    950: '#07060C',
                    900: '#0B0A12',
                    850: '#100E18',
                    800: '#15121F',
                    750: '#1A1626',
                    700: '#221D33',
                },
                gold: {
                    200: '#FBF3E0',
                    300: '#F5DCA8',
                    400: '#E8C87D',
                    500: '#D4AE55',
                    600: '#B98A2E',
                },
                brand: {
                    200: '#E4DCFF',
                    300: '#C9BCFF',
                    400: '#A38CFF',
                    500: '#7C5CFF',
                    600: '#5B3DF5',
                    700: '#4527C9',
                    800: '#2E1B84',
                    900: '#1B1046',
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            boxShadow: {
                'glow-violet': '0 18px 60px -18px rgba(124, 92, 255, 0.65)',
                'glow-gold': '0 18px 60px -22px rgba(232, 200, 125, 0.55)',
                'card-dark': '0 30px 70px -30px rgba(0, 0, 0, 0.85)',
                'card-light': '0 30px 70px -34px rgba(20, 18, 26, 0.28)',
                hairline: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
                'hairline-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
            },
            transitionTimingFunction: {
                luxe: 'cubic-bezier(0.22, 1, 0.36, 1)',
                soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
            keyframes: {
                aurora: {
                    '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
                    '33%': { transform: 'translate3d(3%, -4%, 0) scale(1.08)' },
                    '66%': { transform: 'translate3d(-3%, 3%, 0) scale(0.95)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                'float-slow': {
                    '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                    '50%': { transform: 'translateY(-18px) rotate(1.5deg)' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-120%) skewX(-12deg)' },
                    '100%': { transform: 'translateX(220%) skewX(-12deg)' },
                },
                'glow-pulse': {
                    '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
                    '50%': { opacity: '0.85', transform: 'scale(1.06)' },
                },
                'spin-slow': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                dash: {
                    '0%': { strokeDashoffset: '64' },
                    '100%': { strokeDashoffset: '0' },
                },
                'gradient-x': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                rise: {
                    '0%': { opacity: '0', transform: 'translateY(18px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                aurora: 'aurora 22s ease-in-out infinite',
                'aurora-slow': 'aurora 30s ease-in-out infinite',
                float: 'float 7s ease-in-out infinite',
                'float-slow': 'float-slow 11s ease-in-out infinite',
                marquee: 'marquee 36s linear infinite',
                shimmer: 'shimmer 1.1s ease-in-out',
                'glow-pulse': 'glow-pulse 5s ease-in-out infinite',
                'spin-slow': 'spin-slow 28s linear infinite',
                'gradient-x': 'gradient-x 8s ease infinite',
                rise: 'rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
            },
            backgroundImage: {
                'grid-faint':
                    'linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)',
                'grid-faint-light':
                    'linear-gradient(to right, rgba(20,18,26,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,18,26,0.05) 1px, transparent 1px)',
            },
            backgroundSize: {
                'grid-32': '32px 32px',
            },
        },
    },

    plugins: [forms],
};
