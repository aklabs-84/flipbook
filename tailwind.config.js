/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-purple': '#6366f1',
        'page-bg': '#fdfbf7',
        'warm-cream': '#FEF9E7',
        'mustard-yellow': '#F7C844',
        'grass-green': '#66A844',
        'tomato-red': '#E8553E',
        'carrot-orange': '#F39233',
        'earth-brown': '#4A3228',
      },
      boxShadow: {
        'deep': '0 50px 100px -20px rgba(0, 0, 0, 0.5)',
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.645, 0.045, 0.355, 1)',
      }
    },
  },
  plugins: [],
}
