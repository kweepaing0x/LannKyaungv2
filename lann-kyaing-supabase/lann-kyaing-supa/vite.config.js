import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Use injectManifest instead of generateSW for more control
      registerType: "autoUpdate",
      // Don't cache everything — only cache the app shell, not API calls
      workbox: {
        // Cache strategies
        runtimeCaching: [
          {
            // Tile images — cache first (they don't change)
            urlPattern: /cartocdn\.com|openstreetmap\.org/,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles",
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            // Supabase API — network first, no cache
            urlPattern: /supabase\.co/,
            handler: "NetworkOnly",
          },
          {
            // Telegram API — network only
            urlPattern: /api\.telegram\.org/,
            handler: "NetworkOnly",
          },
        ],
        // Skip waiting so new SW activates immediately
        skipWaiting: true,
        clientsClaim: true,
        // Don't precache source maps
        globIgnores: ["**/*.map"],
      },
      manifest: {
        name: "Lann Kyaing",
        short_name: "Lann Kyaing",
        description: "လမ်းကြောင်း - Real-time road alerts Myanmar",
        theme_color: "#0d0d0d",
        background_color: "#0d0d0d",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
