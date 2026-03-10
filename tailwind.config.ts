import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "#08111F",
        ink: "#D8E1F0",
        slate: {
          950: "#020817"
        },
        brand: {
          50: "#ECF4FF",
          100: "#DCEBFF",
          200: "#B5D3FF",
          300: "#84B4FF",
          400: "#528FFF",
          500: "#2E6CF6",
          600: "#1A54D9",
          700: "#1643AC",
          800: "#183B86",
          900: "#1B346B"
        },
        accent: {
          50: "#FFF7EC",
          100: "#FFEBC9",
          200: "#FFD28B",
          300: "#FFB75A",
          400: "#FF9C31",
          500: "#F57B15",
          600: "#D15C0C"
        },
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626"
      },
      fontFamily: {
        sans: ["Aptos", "\"Segoe UI\"", "\"Microsoft YaHei UI\"", "sans-serif"],
        mono: ["Consolas", "\"Fira Code\"", "monospace"]
      },
      boxShadow: {
        panel: "0 18px 45px rgba(2, 6, 23, 0.18)",
        soft: "0 8px 22px rgba(15, 23, 42, 0.08)"
      },
      backgroundImage: {
        "dashboard-glow":
          "radial-gradient(circle at top left, rgba(46,108,246,0.18), transparent 32%), radial-gradient(circle at top right, rgba(245,123,21,0.12), transparent 28%)"
      }
    }
  },
  plugins: []
};

export default config;
