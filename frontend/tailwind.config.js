/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkblue: {
          50: '#f0f5f9',
          100: '#e1ebf4',
          200: '#c3d8e9',
          300: '#a5c4df',
          400: '#699ccb',
          500: '#2c74b7',
          600: '#2868a5',
          700: '#215789',
          800: '#1a466e',
          900: '#153959',
          950: '#0b1d2c'
        }
      }
    },
  },
  plugins: [],
}
