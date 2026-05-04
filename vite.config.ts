import path from "path"
import { execSync } from "node:child_process"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const resolveBuildVersion = () => {
    if (typeof process.env.VITE_APP_BUILD_VERSION === 'string' && process.env.VITE_APP_BUILD_VERSION.trim().length > 0) {
      return process.env.VITE_APP_BUILD_VERSION.trim();
    }
    try {
      return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      return 'dev-local';
    }
  };

  const buildTargetFromMode = mode === 'public' || mode === 'private' ? mode : undefined;
  const buildTarget = (buildTargetFromMode || process.env.VITE_BUILD_TARGET || 'private').toLowerCase();
  const buildVersion = resolveBuildVersion();
  const routeModule = buildTarget === 'public' ? './src/AppPublic.tsx' : './src/AppPrivate.tsx';
  const providersModule = buildTarget === 'public' ? './src/AppProvidersPublic.tsx' : './src/AppProvidersPrivate.tsx';
  const publicBase = process.env.VITE_PUBLIC_BASE || '/FlowValut-Watch-Faces-Public-Store-/';
  const privateBase = process.env.VITE_PRIVATE_BASE || '/Watch-Faces/';

  return {
    base: buildTarget === 'public' ? publicBase : privateBase,
    build: {
      sourcemap: false,
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
