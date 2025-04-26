/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tw-',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // adjust paths as needed
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#FF6B6B",       // Coral pink
        secondary: "#4ECDC4",     // Mint/teal
        accent: "#FFD166",        // Bright yellow
        pastel: {
          pink: "#FFC6D9",        // Soft pink
          blue: "#A6E1FA",        // Soft blue
          green: "#C1FBA4",       // Soft green
          purple: "#D7B5FF",      // Soft purple
          yellow: "#FFE8B8",      // Soft yellow
        },
        dark: "#2E3440",          // Dark blue-gray
        light: "#F7F9FC",         // Off-white
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 14px 0 rgba(0, 0, 0, 0.05)',
        'hover': '0 6px 20px rgba(0, 0, 0, 0.08)',
        'button': '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};
