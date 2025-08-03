import path from "node:path";
import viteFastify from "@fastify/vite/plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    allowedHosts: [
      "map-preview-service.ridi-prod.svc.cluster.local",
      "map-preview-service.ridi-dev.svc.cluster.local",
    ],
  },
  root: path.join(import.meta.dirname, "src/client"),
  plugins: [viteReact(), viteFastify()],
  build: {
    emptyOutDir: true,
    outDir: path.join(import.meta.dirname, "dist/client"),
  },
});
