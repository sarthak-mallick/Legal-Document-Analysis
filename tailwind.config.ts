import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#d7d6d2",
        input: "#f3f1ec",
        ring: "#1b3c53",
        background: "#f7f2e7",
        foreground: "#17212b",
        primary: {
          DEFAULT: "#1b3c53",
          foreground: "#f7f2e7",
        },
        secondary: {
          DEFAULT: "#d2c1a0",
          foreground: "#17212b",
        },
        accent: {
          DEFAULT: "#9fb3c8",
          foreground: "#17212b",
        },
        muted: {
          DEFAULT: "#ece6d8",
          foreground: "#475569",
        },
        destructive: {
          DEFAULT: "#b42318",
          foreground: "#fff7f7",
        },
      },
      fontFamily: {
        sans: ['"Avenir Next"', "Avenir", "ui-sans-serif", "system-ui"],
        serif: ['"Iowan Old Style"', '"Palatino Linotype"', "ui-serif", "Georgia"],
      },
      boxShadow: {
        panel: "0 24px 60px rgba(23, 33, 43, 0.12)",
      },
      backgroundImage: {
        parchment:
          "radial-gradient(circle at top left, rgba(210, 193, 160, 0.45), transparent 30%), linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(247, 242, 231, 0.92))",
      },
    },
  },
  plugins: [],
};

export default config;
