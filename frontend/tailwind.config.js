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
        // Lego Official Brand Colors
        primary: {
          50: '#fef2f3',
          100: '#fde6e7',
          200: '#fbd0d3',
          300: '#f7a6ab',
          400: '#f1737c',
          500: '#e4032e',  // Lego Official Red
          600: '#d11a2a',
          700: '#b01424',
          800: '#931422',
          900: '#7c1621',
        },
        lego: {
          red: '#E4032E',      // Official Lego Red
          yellow: '#FFD500',   // Official Lego Yellow
          blue: '#0055BF',     // Official Lego Blue
          green: '#00833E',    // Official Lego Green
        },
      },
    },
  },
  plugins: [],
}
