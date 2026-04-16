/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Map Tailwind utility classes to CSS variables defined in index.css
        // These stay in sync when you update :root in index.css
        accent: 'var(--color-accent)',
        success:'var(--color-success)',
        warning:'var(--color-warning)',
        danger: 'var(--color-danger)',
        sim:    'var(--color-sim)',
        'bg-base':  'var(--color-bg-base)',
        'bg-panel': 'var(--color-bg-panel)',
      },
    },
  },
  plugins: [],
}
