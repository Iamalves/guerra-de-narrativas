import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento, /api vai para o backend: o jogo e a API ficam no mesmo endereço, sem CORS.
// Padrão: a versão Node (porta 3001). Para usar a versão PHP do Docker (a que vai para a HostGator): GN_API=http://localhost:8088
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /* a pasta fica no OneDrive, onde o aviso de "arquivo mudou" do Windows às vezes não chega: confere por consulta */
    watch: { usePolling: true, interval: 300 },
    proxy: { '/api': { target: process.env.GN_API || 'http://localhost:3001', changeOrigin: false } },
  },
});
