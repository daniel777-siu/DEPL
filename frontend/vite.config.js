import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Fixed dev port
    port: 5173,
    strictPort: true,
    // Backend proxy
    proxy: {
      '/auth': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/teams': 'http://localhost:3000',
      '/languagues': 'http://localhost:3000',
      '/general': 'http://localhost:3000',
      // Endpoints raíz montados en '/'
      '/login': 'http://localhost:3000',
      '/me': 'http://localhost:3000',
      '/logout': 'http://localhost:3000',
      '/register': 'http://localhost:3000',
    },
  },
});
