/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        oscar: {
          50: '#faf9f7',
          100: '#f4f3ef',
          200: '#e8e6e1',
          300: '#d5d2cb',
          400: '#a8a49b',
          500: '#787164',
          600: '#5c564c',
          700: '#45413a',
          800: '#2c2a26',
          900: '#1a1917',
        },
      },
      animation: {
        'bounce-slow': 'bounce 1.5s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
