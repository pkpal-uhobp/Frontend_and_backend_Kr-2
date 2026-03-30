import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // На Windows «localhost» иногда резолвится в 127.0.0.1, а Vite по умолчанию слушает только ::1 — тогда ERR_CONNECTION_REFUSED.
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
