
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    define: {
      // Explicitly replacing process.env.API_KEY with the string value
      // This allows 'process.env.API_KEY' to work in the browser code
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      
      // Polyfill process.env for other libraries to prevent "process is not defined" error
      // Note: This must come AFTER specific replacements if handled by the bundler logic,
      // but in 'define', direct matches usually take precedence. 
      // We set it to an empty object so access to other keys returns undefined.
      'process.env': {}
    }
  };
});
