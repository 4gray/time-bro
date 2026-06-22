import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json";

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version)
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  },
  preview: {
    host: "127.0.0.1",
    port: 4173
  },
  test: {
    exclude: ["dist/**", "dist-electron/**", "node_modules/**"]
  }
});
