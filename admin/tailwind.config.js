/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2F49C8', // Deep Indigo
          light: '#4B5CE4',   // Royal Blue
        },
        secondary: {
          DEFAULT: '#F3F4F6', // Clean Light Gray
          dark: '#E5E7EB',
        },
        surface: '#FFFFFF',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(180deg, #2F49C8 0%, #4B5CE4 100%)',
        'accent-gradient': 'linear-gradient(90deg, #4B5CE4 0%, #6366f1 100%)',
      },
      borderRadius: {
        'card': '16px',
        'btn': '12px',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 15px rgba(75, 92, 228, 0.3)',
      }
    },
  },
  plugins: [],
}
