import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  const resolveBuildVersion = () => {
    if (typeof process.env.VITE_APP_BUILD_VERSION === 'string' && process.env.VITE_APP_BUILD_VERSION.trim().length > 0) {
      return process.env.VITE_APP_BUILD_VERSION.trim();
    }
    try {
      const hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      const now = new Date();
      const stamp = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      return `${hash}@${stamp}`;
    } catch {
      return 'dev-local';
    }
  };
  return {
    base: '/editable-watchfaces/',
    define: {
      'import.meta.env.VITE_APP_BUILD_VERSION': JSON.stringify(resolveBuildVersion()),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
    server: { port: 5184, strictPort: true },
    preview: { port: 5184, strictPort: true },
  };
});
