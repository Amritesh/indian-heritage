import forms from '@tailwindcss/forms';
export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Primary
                primary: '#775a19',
                'on-primary': '#ffffff',
                'primary-container': '#c5a059',
                'on-primary-container': '#4e3700',
                'primary-fixed': '#ffdea5',
                'primary-fixed-dim': '#e9c176',
                'on-primary-fixed': '#261900',
                'on-primary-fixed-variant': '#5d4201',
                // Secondary (Temple Red)
                secondary: '#b22b1d',
                'on-secondary': '#ffffff',
                'secondary-container': '#fe624e',
                'on-secondary-container': '#650000',
                'secondary-fixed': '#ffdad4',
                'secondary-fixed-dim': '#ffb4a8',
                'on-secondary-fixed': '#410000',
                'on-secondary-fixed-variant': '#8f0f07',
                // Tertiary (Bronze)
                tertiary: '#75584d',
                'on-tertiary': '#ffffff',
                'tertiary-container': '#c19e92',
                'on-tertiary-container': '#4e352c',
                'tertiary-fixed': '#ffdbce',
                'tertiary-fixed-dim': '#e4beb2',
                'on-tertiary-fixed': '#2b160f',
                'on-tertiary-fixed-variant': '#5b4137',
                // Error
                error: '#ba1a1a',
                'on-error': '#ffffff',
                'error-container': '#ffdad6',
                'on-error-container': '#93000a',
                // Surface / Neutral
                background: '#fdf8f6',
                'on-background': '#1c1b1b',
                surface: '#fdf8f6',
                'on-surface': '#1c1b1b',
                'on-surface-variant': '#4e4639',
                'surface-variant': '#e5e2e0',
                'surface-dim': '#ddd9d7',
                'surface-bright': '#fdf8f6',
                'surface-tint': '#775a19',
                'surface-container-lowest': '#ffffff',
                'surface-container-low': '#f7f3f1',
                'surface-container': '#f1edeb',
                'surface-container-high': '#ebe7e5',
                'surface-container-highest': '#e5e2e0',
                // Outline
                outline: '#7f7667',
                'outline-variant': '#d1c5b4',
                // Inverse
                'inverse-surface': '#31302f',
                'inverse-on-surface': '#f4f0ee',
                'inverse-primary': '#e9c176',
            },
            fontFamily: {
                headline: ['"Noto Serif"', 'serif'],
                body: ['Manrope', 'sans-serif'],
                label: ['Inter', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '0.125rem',
                sm: '0.125rem',
                md: '0.25rem',
                lg: '0.5rem',
                xl: '0.75rem',
            },
            boxShadow: {
                ambient: '0 24px 60px rgba(28, 27, 27, 0.06)',
                card: '0 18px 42px rgba(54, 43, 24, 0.05)',
                sm: '0 2px 8px rgba(28, 27, 27, 0.04)',
            },
            backgroundImage: {
                parchment: 'radial-gradient(#775a1908 1px, transparent 0)',
                bronze: 'linear-gradient(135deg, #775a19 0%, #8f6a1d 42%, #c5a059 100%)',
            },
            animation: {
                drift: 'drift 18s ease-in-out infinite',
                fadeUp: 'fadeUp 0.6s ease both',
                'spin-slow': 'spin 20s linear infinite',
            },
            keyframes: {
                drift: {
                    '0%, 100%': { transform: 'translate3d(0,0,0)' },
                    '50%': { transform: 'translate3d(0,-10px,0)' },
                },
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translate3d(0, 18px, 0)' },
                    '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
                },
            },
            maxWidth: {
                content: '82rem',
            },
        },
    },
    plugins: [forms],
};
