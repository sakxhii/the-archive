
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        brand: {
          50: '#f5f7fa',
          100: '#eaeef5',
          200: '#d0dbe9',
          300: '#aabccc',
          400: '#7f99b3',
          500: '#5a7a9a',
          600: '#3d5c7a', // Corporate Blue-Grey
          700: '#2e455c',
          800: '#203040', // Deep Navy
          900: '#141e29',
        },
        accent: {
          light: '#fdba74', // Soft heavy orange
          DEFAULT: '#f97316', // Orange-500
          dark: '#ea580c',
        }
      },
    },
  },
  plugins: [],
}
