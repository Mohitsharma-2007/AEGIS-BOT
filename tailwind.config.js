/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aegis: {
          bg: '#08090B',
          secondary: '#0D0F12',
          panel: '#111318',
          card: '#14171E',
          hover: '#1A1E27',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-focus': 'rgba(0, 242, 254, 0.4)',
          text: {
            primary: '#F5F5F5',
            secondary: '#9A9DA5',
            muted: '#646873'
          },
          accent: {
            DEFAULT: '#00F2FE',
            glow: 'rgba(0, 242, 254, 0.15)',
            dim: '#0284C7',
            dark: '#0369A1'
          },
          status: {
            emerald: '#10B981',
            amber: '#F59E0B',
            rose: '#F43F5E',
            purple: '#A855F7'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'aegis-subtle': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'aegis-glow': '0 0 20px -4px rgba(0, 242, 254, 0.25)',
        'aegis-card': '0 2px 10px rgba(0, 0, 0, 0.3)'
      }
    },
  },
  plugins: [],
}

