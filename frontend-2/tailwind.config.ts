import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "2rem",
        lg: "4rem",
        xl: "5rem",
        "2xl": "6rem",
      },
      screens: {
        "2xl": "1200px", /* Slightly narrower max width for better readability */
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        estuary: {
          50: "#f0f7f8",
          100: "#d9eaed",
          200: "#b4d5db",
          300: "#8ebfc9",
          400: "#68a9b7",
          500: "#4293a5",
          600: "#347584",
          700: "#2c5c68",
          800: "#264a54",
          900: "#014451", // Deep teal - primary color from MUI theme
          950: "#0a2c34",
        },
        wellness: {
          50: "#f0f9f8",
          100: "#d9f2ef",
          200: "#b4e4df",
          300: "#8ed6cf",
          400: "#68c8bf",
          500: "#42baaf",
          600: "#20b2aa", // LightSeaGreen - secondary color from MUI theme
          700: "#1a8f88",
          800: "#17726c",
          900: "#155c58",
          950: "#0a3331",
        },
        warm: {
          50: "#fefdf9",
          100: "#fefaf1",
          200: "#fcf4e6",
          300: "#faefde", // Soft peach/terracotta inspired by Octave
          400: "#f7e4d0",
          500: "#f3d8c1",
          600: "#e8c4a0",
          700: "#d1a373",
          800: "#b8824d",
          900: "#8b5a2b",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
