/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}" // ✅ Phải có dòng này
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};