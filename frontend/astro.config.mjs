import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";
import icon from "astro-icon";

export default defineConfig({
  output: "hybrid",
  adapter: node({ mode: "standalone" }),
  integrations: [
    tailwind(),
    icon({
      iconDir: "src/icons",
      collections: ["lucide"],
    }),
  ],
});
