import path from "path"
import { execSync } from "node:child_process"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv makes .env.<mode> vars available to vite.config.ts (process.env alone does NOT load them)
  const env = loadEnv(mode, process.cwd(), '');
  const resolveBuildVersion = () => {
    if (typeof process.env.VITE_APP_BUILD_VERSION === 'string' && process.env.VITE_APP_BUILD_VERSION.trim().length > 0) {
      return process.env.VITE_APP_BUILD_VERSION.trim();
    }
    try {
      const hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      // Append a short timestamp (MMDD-HHmm) so each build is uniquely identifiable
      // even when the git hash hasn't changed yet (build runs before commit).
      const now = new Date();
      const stamp = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      return `${hash}@${stamp}`;
    } catch {
      return 'dev-local';
    }
  };

  const buildTargetFromMode = mode === 'public' || mode === 'staging'
    ? 'public'
    : mode === 'private'
      ? 'private'
      : undefined;
  const buildTarget = (buildTargetFromMode || process.env.VITE_BUILD_TARGET || 'private').toLowerCase();
  const buildVersion = resolveBuildVersion();
  const routeModule = buildTarget === 'public' ? './src/AppPublic.tsx' : './src/AppPrivate.tsx';
  const providersModule = buildTarget === 'public' ? './src/AppProvidersPublic.tsx' : './src/AppProvidersPrivate.tsx';
  // The public storefront is served from the root of www.fvwatchfaces.com.
  // Keep the tracked fallback correct so clean deployment clones do not depend
  // on the ignored .env.public.local file.
  const publicBase = env.VITE_PUBLIC_BASE || process.env.VITE_PUBLIC_BASE || '/';
  const privateBase = env.VITE_PRIVATE_BASE || process.env.VITE_PRIVATE_BASE || '/Watch-Faces/';

  return {
    base: buildTarget === 'public' ? publicBase : privateBase,
    // Public Store releases are assembled from an explicit allowlist by
    // prepareFirebaseHosting.mjs. Never let Vite copy the shared creator
    // public/ directory into a customer-facing build.
    publicDir: buildTarget === 'public' ? false : 'public',
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            paddle: ['@paddle/paddle-js'],
          },
        },
      },
    },
    define: {
      'import.meta.env.VITE_BUILD_TARGET': JSON.stringify(buildTarget),
      'import.meta.env.VITE_APP_BUILD_VERSION': JSON.stringify(buildVersion),
    },
    plugins: buildTarget === 'public' ? [react()] : [inspectAttr(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@app-routes": path.resolve(__dirname, routeModule),
        "@app-providers": path.resolve(__dirname, providersModule),
      },
    },
  };
});
