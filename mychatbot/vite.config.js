// vite.config.mjs

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The config must use the plugin
export default defineConfig({
  plugins: [tailwindcss(),react()], 
  // ... other config (like Tailwind/PostCSS integration, if applicable)
});