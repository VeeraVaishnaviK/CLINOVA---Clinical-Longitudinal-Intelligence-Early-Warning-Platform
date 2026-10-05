/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F4F8FB",
        panel: "#FFFFFF",
        border: "#E3EBF2",
        navy: {
          900: "#0B1F33",
          800: "#132D48",
          700: "#1C3E60",
        },
        medical: {
          blue: "#1B6FB3",
          teal: "#0E9AA7",
          muted: "#5B6B7A",
          dark: "#0F2137",
        },
        semantic: {
          green: "#1E9E6A",
          greenBg: "#E8F6F0",
          amber: "#D99A00",
          amberBg: "#FFF6DD",
          red: "#D6353A",
          redBg: "#FDECEC",
          blue: "#2F80ED",
          blueBg: "#EAF2FE",
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        panel: "14px",
      },
      boxShadow: {
        soft: "0 2px 12px rgba(11, 31, 51, 0.05)",
        card: "0 1px 3px rgba(11, 31, 51, 0.04), 0 4px 14px rgba(11, 31, 51, 0.03)",
        drawer: "-4px 0 24px rgba(11, 31, 51, 0.12)",
      },
    },
  },
  plugins: [],
}
