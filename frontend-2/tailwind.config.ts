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
        sans: ["var(--font-dm-sans)", "DM Sans", "system-ui", "sans-serif"],
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
        // Earth-inspired palette
        sage: {
          50: "#f6f7f5",
          100: "#e8ebe6",
          200: "#d3d9cc",
          300: "#b5c0a5",
          400: "#95a57f",
          500: "#7a8b63",
          600: "#61704d",
          700: "#4d5a3e",
          800: "#404934",
          900: "#363e2e",
        },
        terracotta: {
          50: "#fdf8f6",
          100: "#f9ede6",
          200: "#f3dcc9",
          300: "#e8c1a0",
          400: "#daa176",
          500: "#cc8156",
          600: "#b8654a",
          700: "#994e3f",
          800: "#7b4037",
          900: "#65362f",
        },
        blush: {
          50: "#fdf9f8",
          100: "#faf0ee",
          200: "#f5dfd9",
          300: "#edc5ba",
          400: "#e2a593",
          500: "#d68770",
          600: "#c56a55",
          700: "#a55245",
          800: "#87433b",
          900: "#703933",
        },
        olive: {
          50: "#f8f9f5",
          100: "#eef0e5",
          200: "#dce0ca",
          300: "#c2caa2",
          400: "#a7b27a",
          500: "#8b985b",
          600: "#6f7a47",
          700: "#576039",
          800: "#474e31",
          900: "#3c412a",
        },
        cream: {
          50: "#fdfcf8",
          100: "#faf8f0",
          200: "#f5f1e6",
          300: "#ede5d4",
          400: "#e2d5bd",
          500: "#d4c2a5",
          600: "#c2a78a",
          700: "#a58970",
          800: "#866f5d",
          900: "#705c4f",
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
