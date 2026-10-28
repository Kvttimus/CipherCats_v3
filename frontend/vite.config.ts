import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    port: 5173,
    // In dev, /api calls go to the local Flask server (python wsgi.py).
    // 127.0.0.1, not localhost: Node may resolve localhost to IPv6 (::1), but Flask listens on IPv4.
    proxy: { "/api": "http://127.0.0.1:5000" },
  },
});
