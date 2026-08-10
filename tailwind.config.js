/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: {
        DEFAULT: '#f2eddf', // Bone
        5: 'rgba(242, 237, 223, 0.05)',
        10: 'rgba(242, 237, 223, 0.1)',
        15: 'rgba(242, 237, 223, 0.15)',
        20: 'rgba(242, 237, 223, 0.2)',
        30: 'rgba(242, 237, 223, 0.3)',
      },
      // Ink / Bone / Acid / Moss / Smoke mappings
      gray: {
        50: '#f2eddf', // Bone
        100: '#eae4d1', // Bone-2
        200: '#ded7c1', // Bone-3
        300: '#a6ab97', // Smoke
        400: '#a6ab97', // Smoke
        500: '#595f49', // Moss
        600: '#595f49', // Moss
        700: '#262b19', // Ink-4 (Border)
        800: '#1b1f13', // Ink-3 (Hover surface)
        900: '#151810', // Ink-2 (Elevated surface)
        950: '#0f110a', // Ink (Primary background)
      },
      slate: {
        50: '#f2eddf',
        100: '#eae4d1',
        200: '#ded7c1',
        300: '#a6ab97',
        400: '#a6ab97',
        500: '#595f49',
        600: '#595f49',
        700: '#262b19',
        800: '#1b1f13',
        900: '#151810',
        950: '#0f110a',
      },
      zinc: {
        50: '#f2eddf',
        100: '#eae4d1',
        200: '#ded7c1',
        300: '#a6ab97',
        400: '#a6ab97',
        500: '#595f49',
        600: '#595f49',
        700: '#262b19',
        800: '#1b1f13',
        900: '#151810',
        950: '#0f110a',
      },
      primary: {
        50: 'rgba(200, 245, 66, 0.05)',
        100: 'rgba(200, 245, 66, 0.1)',
        200: 'rgba(200, 245, 66, 0.2)',
        300: 'rgba(200, 245, 66, 0.3)',
        400: '#c8f542', // Acid
        500: '#b4e32b', // Acid-2
        600: '#8cb91e', // Acid-3
        700: '#8cb91e',
        800: '#8cb91e',
        900: '#8cb91e',
      },
      accent: {
        400: '#c8f542',
        500: '#b4e32b',
        600: '#8cb91e',
      },
      blue: {
        50: '#f2eddf',
        100: '#eae4d1',
        400: '#c8f542',
        500: '#c8f542',
        600: '#b4e32b',
        700: '#8cb91e',
        950: '#0f110a',
      },
      teal: {
        50: '#f2eddf',
        100: '#eae4d1',
        400: '#c8f542',
        500: '#c8f542',
        600: '#b4e32b',
        700: '#8cb91e',
        950: '#0f110a',
      },
      indigo: {
        50: '#f2eddf',
        100: '#eae4d1',
        400: '#c8f542',
        500: '#c8f542',
        600: '#b4e32b',
        700: '#8cb91e',
        950: '#0f110a',
      },
      orange: {
        400: '#c8f542',
        500: '#b4e32b',
        600: '#8cb91e',
      },
    },
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body:    ['Instrument Sans', 'sans-serif'],
        mono:    ['Space Mono', 'monospace'],
        sans:    ['Instrument Sans', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'reveal':     'reveal 800ms cubic-bezier(0.22,1,0.36,1) both',
        'floaty':     'floaty 5.5s ease-in-out infinite',
        'floaty-2':   'floaty 6.5s ease-in-out 0.8s infinite',
        'floaty-3':   'floaty 7.5s ease-in-out 1.6s infinite',
        'spin-slow':  'spin-slow 26s linear infinite',
        'pop':        'pop 500ms cubic-bezier(0.22,1,0.36,1) both',
        'pulse-dot':  'pulse-dot 2.4s ease-in-out infinite',
        'toast-in':   'toast-in 450ms cubic-bezier(0.22,1,0.36,1) both',
        'marquee':    'marquee var(--marquee-dur,32s) linear infinite',
        'kenburns':   'kenburns 18s ease-in-out infinite alternate',
      },
      keyframes: {
        reveal: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-9px)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        pop: {
          '0%':   { transform: 'scale(0.4)', opacity: '0' },
          '70%':  { transform: 'scale(1.35)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-dot': {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.3' },
        },
        'toast-in': {
          '0%':   { opacity: '0', transform: 'translateY(20px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        kenburns: {
          '0%':   { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1.14)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
