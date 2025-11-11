// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          tfs: {
            red: '#8B0000',
            gold: '#DAA520',
            dark: '#2F2F2F',
            light: '#F8F8F8',
            white: '#FFFFFF',
          }
        }
      },
    },
    plugins: [],
  }