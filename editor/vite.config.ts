import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// The engine lives one level up so the headless render page can share it.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { port: 5174, fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] } },
  build: { outDir: "dist", emptyOutDir: true },
});
