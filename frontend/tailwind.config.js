/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Backgrounds ── */
        'bg-dark': '#1a1410',
        'bg-sidebar': '#181410',
        'bg-panel': '#e8e2d8',
        'bg-canvas': '#f0ece0',
        'bg-light': '#f0ece0',
        'bg-form': '#e8e2d8',
        'bg-input': '#dad3bd',
        'bg-darkest': '#0d0b09',

        /* ── Text colors ── */
        'text-light': '#f0ece0',
        'text-muted': '#9a9080',
        'text-dark': '#1a1410',
        'text-medium': '#3d3628',
        'text-panel': '#2a2218',
        'text-panel-muted': '#7a7060',

        /* ── Accents ── */
        'accent-gold': '#c9a84c',
        'accent-gold-light': '#e2c47a',

        /* ── Borders ── */
        'border-dark': '#2e2820',
        'border-panel': '#cec8bc',
        'border-light': '#d0c9bc',

        /* ── Status colors ── */
        'status-error': '#c0392b',
        'status-success': '#2e7d52',
        'status-warning': '#b8860b',

        /* ── Node colors ── */
        'node-bg': '#f7f3ed',
        'node-border': '#cec8bc',
        'node-error': '#fdf0ee',
        'node-error-border': '#e8a090',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier', 'monospace'],
      },
      keyframes: {
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'shake': 'shake 0.3s ease-in-out',
        'blink': 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
};
