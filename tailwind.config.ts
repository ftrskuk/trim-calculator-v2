import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#38bdf8',
          600: '#0ea5e9',
          700: '#0284c7'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
