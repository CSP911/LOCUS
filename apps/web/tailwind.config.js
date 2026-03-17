/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // LŌCUS brand
        locus: {
          bg: '#06080d',
          surface: '#0d1020',
          border: 'rgba(255,255,255,0.08)',
          // Domain colors
          foundation: '#7ec8e3', // X — 기반
          output: '#ddd8b0',     // Y — 성과
          connection: '#f0a870', // Z — 관계
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
