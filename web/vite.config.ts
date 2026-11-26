import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localDataPlugin } from '../server/plugin.mjs';
export default defineConfig({ plugins: [react(),localDataPlugin()], base: './',server:{host:'127.0.0.1',fs:{deny:['**/.env','**/.env.*','**/*.{crt,pem}','**/data/**']}},preview:{host:'127.0.0.1'} });
