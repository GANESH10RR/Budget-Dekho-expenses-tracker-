/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#14213D", soft: "#22335C", mute: "#5B6784" },
        canvas: "#F2F5F9",
        saffron: { DEFAULT: "#F5A524", dark: "#D98E10" },
        income: "#138A72",
        expense: "#D6455D",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ["Figtree", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
