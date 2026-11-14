import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/SEU-CEU-V2/",
  plugins: [
    react(),
    VitePWA({
      manifest: false,
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest,json,woff2}"],
        navigateFallback: "/SEU-CEU-V2/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
