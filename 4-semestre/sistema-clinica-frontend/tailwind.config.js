/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e6eff6",
          100: "#c9ddee",
          200: "#a6c6e2",
          300: "#82aed5",
          400: "#5e95c7",
          500: "#3b7db9",
          600: "#1d669e",
          700: "#15527e",  // tom intermediário
          800: "#0d4a78",  // 💙 sua cor principal
          900: "#083a60"
        }
      },
      boxShadow: {
        elegant: '0 8px 24px rgba(13,74,120,0.08)', // azul suave nas sombras
      }
    },
  },
  plugins: [],
};
