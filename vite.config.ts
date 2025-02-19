import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

// Export the Vite configuration
export default defineConfig({
  base: '/me',
  plugins: [react(), tailwindcss()],
}); 