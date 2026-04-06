import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        page: "hsl(var(--page))",
        card: "hsl(var(--card))",
        border: "hsl(var(--border))",
        accent: "hsl(var(--accent))",
        text: "hsl(var(--text))"
      }
    }
  },
  plugins: []
};

export default config;
