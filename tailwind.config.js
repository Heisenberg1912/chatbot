/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#c6da9c',
          blue: '#b2c4ca',
          gray: '#dbdbdb',
        },
        surface: { DEFAULT: '#000000', light: '#050505', lighter: '#0a0a0a' },
        content: { DEFAULT: '#ffffff', muted: '#dbdbdb', subtle: '#b2c4ca' },
      },
      backgroundImage: {
        'brand-glow': 'radial-gradient(circle at top, rgba(255, 255, 255, 0.03), transparent 50%), radial-gradient(circle at top right, rgba(255, 255, 255, 0.02), transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.2, 0, 0, 1)',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.2, 0, 0, 1)',
        'slide-up-stagger': 'slideUp 0.6s cubic-bezier(0.2, 0, 0, 1) both',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
};