import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:  "#1a2744",
          gold:  "#f5a623",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
