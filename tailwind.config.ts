import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "hot-black": "#080808",
        "hot-gold": "#D4AF37",
        "hot-red": "#B11226",
      },
    },
  },
  plugins: [],
};

export default config;

