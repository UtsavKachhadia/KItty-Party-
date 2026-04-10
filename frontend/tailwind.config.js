/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'background': '#131313',
        'surface': '#131313',
        'surface-container-low': '#1C1B1B',
        'surface-container-high': '#2A2A2A',
        'surface-container-highest': '#353534',
        'surface-container-lowest': '#0E0E0E',
        'primary': '#007AFF',
        'success': '#28A745',
        'tertiary': '#FFBF00',
        'error': '#DC3545',
        'secondary': '#6C757D',
        'on-surface': '#E5E2E1',
        'on-surface-variant': '#C1C6D7',
        'on-primary': '#FFFFFF',
        'outline-variant': '#414755',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'shake': 'shake 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
};
