/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./public/js/**/*.js",
    "./public/admin/**/*.html",
    "./public/resepsionis/**/*.html",
    "./public/tamu/**/*.html",
    "./**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#cf7010',
        secondary: '#393028',
        background: '#181411',
        'card-bg': '#24211e',
        'text-color': '#ffffff',
        'text-muted': '#b9ab9d',
        'input-bg': '#2c2825',
        'input-border': '#4d4237',
        'table-header-bg': '#2a2724',
        'table-row-hover': '#2f2c29'
      },
      fontFamily: {
        'serif': ['Noto Serif', 'serif'],
        'sans': ['Noto Sans', 'sans-serif']
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
  darkMode: 'class'
}
