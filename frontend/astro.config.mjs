import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";
import icon from "astro-icon";
import AstroPWA from "@vite-pwa/astro";

export default defineConfig({
  site: "https://splitmate.app",
  output: "hybrid",
  adapter: node({ mode: "standalone" }),
  integrations: [
    tailwind(),
    icon({
      iconDir: "src/icons",
      collections: ["lucide"],
    }),
    AstroPWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "SplitMate",
        short_name: "SplitMate",
        description:
          "Split expenses effortlessly with friends using Google Sign-In and UPI payments.",
        theme_color: "#09090b",
        background_color: "#09090b",
        display: "standalone",
        orientation: "portrait-primary",
        categories: ["finance", "productivity"],
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-192x192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{css,js,woff,woff2,svg,png,ico}"],
        navigateFallback: "/offline",
        navigateFallbackDenylist: [/\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});
