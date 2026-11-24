/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#06080e',
          900: '#0c101c',
          850: '#111728',
          800: '#161e34',
          700: '#222f52',
          600: '#324577',
          accent: '#00f2fe',
          neon: '#4facfe',
          emerald: '#00f5a0',
          warning: '#f6ad55',
          danger: '#ff4b72'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
