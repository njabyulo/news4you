import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@auth0/")) return "auth";
          if (id.includes("@reduxjs/") || id.includes("react-redux")) return "state";
          if (/node_modules\/(react|react-dom|react-router)(\/|$)/.test(id)) return "react";
        },
      },
    },
  },
});
