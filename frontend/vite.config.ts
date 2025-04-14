import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

let env = process.env.NODE_ENV || "development";
let isDev = env == "development";

let name = isDev ? "Bambu Spoolman (Dev)" : "Bambu Spoolman";
let shortName = isDev ? "BambuSpoolman-Dev" : "BambuSpoolman";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: name,
        short_name: shortName,
        description: "A spoolman integration for bambulab printers",
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
  resolve: {
    alias: {
      "@app": "/src",
    },
  },
});
