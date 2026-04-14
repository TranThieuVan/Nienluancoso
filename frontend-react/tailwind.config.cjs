// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 'sans' là font mặc định của Tailwind. 
        // Ghi đè ở đây giúp tất cả components tự nhận font này.
        'sans': ['Quicksand', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}