import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#FFFFFF",
        primary: "#0F172A",
        secondary: "#64748B",
        accent: "#3B82F6",
        "accent-hover": "#2563EB",
        border: "#E2E8F0",
        "border-dark": "#CBD5E1",
        // v2 design tokens (see globals.css :root for full set)
        "rs-bg": "#050505",
        "rs-text": "#f5f5f5",
        "rs-muted": "#a1a1aa",
        "rs-dim": "#71717a",
        "rs-green": "#22c55e",
        "rs-blue": "#60a5fa",
        "rs-purple": "#c084fc",
        "rs-pink": "#f472b6",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 10px 25px rgba(0,0,0,0.08)",
        "card-lg": "0 4px 14px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        card: "12px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;