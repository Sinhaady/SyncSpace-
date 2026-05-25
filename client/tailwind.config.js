// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",
        secondary: "#f43f5e",
      },

      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },

      screens: {
        xs: "480px",
        "3xl": "1920px",
      },
    },
  },

  plugins: [],
};