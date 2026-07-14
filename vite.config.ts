import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/gym/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["exercises/*.png"],
      manifest: {
        name: "Gym Tracker",
        short_name: "Gym",
        description: "Local-first workout tracker",
        id: ".",
        scope: ".",
        lang: "ru",
        categories: ["health", "fitness", "productivity"],
        theme_color: "#1f6f68",
        background_color: "#f7f5ef",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"]
      }
    })
  ]
});
