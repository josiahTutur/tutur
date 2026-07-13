/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "ui-rounded", "system-ui", "sans-serif"],
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand accents
        neon: {
          cyan: "hsl(247 74% 63%)", // periwinkle (Maya/AI)
          purple: "hsl(259 80% 55%)", // Tutur Violet
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "glow-cyan": "0 10px 24px -8px hsl(259 80% 55% / 0.4), 0 2px 8px -4px hsl(259 80% 55% / 0.25)",
        "glow-purple": "0 10px 24px -8px hsl(259 80% 55% / 0.4), 0 2px 8px -4px hsl(259 80% 55% / 0.25)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // The tracker's question transition. Direction-aware: forward slides in
        // from the right, Back from the left — so a parent can SEE which way she
        // moved. Ten near-identical screens changed instantly before this, and a
        // question you did not notice changing is a question you answer twice.
        "q-in-next": {
          "0%": { opacity: "0", transform: "translateX(18px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "q-in-prev": {
          "0%": { opacity: "0", transform: "translateX(-18px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 8px 22px -8px hsl(259 80% 55% / 0.45)" },
          "50%": { boxShadow: "0 12px 30px -6px hsl(259 80% 55% / 0.6)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-in": "fade-in 0.6s ease forwards",
        "q-in-next": "q-in-next 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "q-in-prev": "q-in-prev 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-glow": "pulse-glow 2.8s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
