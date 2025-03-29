import path from "node:path";
import viteFastify from "@fastify/vite/plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    allowedHosts: ["map-preview-service.ridi-prod.svc.cluster.local"], // TODO vite in prod build needed
  },
  root: path.join(import.meta.dirname, "./src/client/"),
  plugins: [viteFastify(), viteReact({ jsxRuntime: "automatic" })],
});
