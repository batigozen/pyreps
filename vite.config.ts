import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Light and dark page colours. Kept in sync with --bg in src/index.css.
const BG_LIGHT = "#f7f6f2";
const ACCENT = "#0b6e69";

// GitHub Pages can't send headers, so the CSP is a <meta> tag.
// It covers this page only: the Pyodide worker has its own locks, see src/python/worker.ts.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

// Build only: the dev server injects an inline React Refresh script that this CSP would block.
function contentSecurityPolicy(): Plugin {
  return {
    name: "pyreps-csp",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
        injectTo: "head-prepend",
      },
    ],
  };
}

export default defineConfig({
  base: "/pyreps/",
  worker: { format: "es" },
  plugins: [
    react(),
    tailwindcss(),
    contentSecurityPolicy(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        id: "/pyreps/",
        name: "PyReps",
        short_name: "PyReps",
        description: "Short daily Python practice.",
        lang: "en",
        start_url: "/pyreps/",
        scope: "/pyreps/",
        display: "standalone",
        orientation: "portrait",
        background_color: BG_LIGHT,
        theme_color: ACCENT,
        icons: [
          { src: "icons/pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      // The glob already covers the icons; the plugin adds the manifest itself.
      includeManifestIcons: false,
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,svg,png,ico,woff2,wasm,zip,json}"],
        // pyodide.asm.wasm is about 10 MB.
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
