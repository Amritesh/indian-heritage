/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5B4A18',
          light: '#A97B07',
        },
        secondary: {
          DEFAULT: '#F3F1EC',
          dark: '#7A746C',
        },
        accent: {
          DEFAULT: '#B88A00',
          muted: '#F3E3C2'
        },
        green: {
          DEFAULT: '#2F9E44'
        },
        paper: '#F7F5F1',
        cream: '#FBF9F4'
      },
      fontFamily: {
        'sans': ['Alegreya Sans', 'sans-serif'],
        'serif': ['DM Serif Display', 'serif'],
      },
      backgroundImage: {
        'chevron-pattern': "repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0 1px, transparent 1px 18px)"
      }
      ,
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.05' }],
        'display-md': ['2.25rem', { lineHeight: '1.1' }]
      }
    },
  },
  plugins: [],
}