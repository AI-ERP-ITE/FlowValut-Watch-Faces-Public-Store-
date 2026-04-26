import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const buildTargetFromMode = mode === 'public' || mode === 'private' ? mode : undefined;
  const buildTarget = (buildTargetFromMode || process.env.VITE_BUILD_TARGET || 'private').toLowerCase();
  const routeModule = buildTarget === 'public' ? './src/AppPublic.tsx' : './src/AppPrivate.tsx';

  return {
    base: '/Watch-Faces/',
    define: {
      'import.meta.env.VITE_BUILD_TARGET': JSON.stringify(buildTarget),
    },
    plugins: [inspectAttr(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@app-routes": path.resolve(__dirname, routeModule),
      },
    },
  };
});
