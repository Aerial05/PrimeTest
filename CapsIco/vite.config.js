import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

//this is where the path npm was used for. 
//para pwede na @ ung gamitin, equal to ./src pero tinamad din ako gamitin para sa iba ahaha
