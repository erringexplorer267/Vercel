// tailwind.config.js

import typography from '@tailwindcss/typography'; 

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // CRITICAL: Ensure this array is correct so Tailwind scans your files
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // CRITICAL: This line registers the plugin that provides the 'prose' styles
    typography, 
  ],
};