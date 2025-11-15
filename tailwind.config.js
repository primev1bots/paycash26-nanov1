/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ['SF Pro', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        spinSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        spinFast: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        // Optional: Add more fan-like animations
        fanStart: {
          "0%": { transform: "rotate(0deg)", opacity: "0.8" },
          "100%": { transform: "rotate(360deg)", opacity: "1" },
        },
        fanPulse: {
          "0%, 100%": { transform: "rotate(0deg) scale(1)" },
          "50%": { transform: "rotate(180deg) scale(1.05)" },
        }
      },
      animation: {
        spinSlow: "spinSlow 8s linear infinite",
        spinFast: "spinFast 2s linear infinite",
        fanStart: "fanStart 0.5s ease-out forwards",
        fanPulse: "fanPulse 4s ease-in-out infinite",
      },
      boxShadow: {
        glow: "0 0 25px rgba(168, 85, 247, 0.5)",
        fanGlow: "0 0 40px rgba(76, 156, 226, 0.6)", // Specific fan glow
      },
    },
  },
  plugins: [],
}