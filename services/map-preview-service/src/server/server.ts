import path from "node:path";

import FastifyVite from "@fastify/vite";
import { RidiLogger } from "@ridi/logger";
import { mapPreviewContract } from "@ridi/map-preview-service-contracts";
import { initServer } from "@ts-rest/fastify";
import Fastify from "fastify";

import { env } from "./env.ts";
import { handleMapPreviewRequest } from "./map-preview.ts";

const server = Fastify();

await server.register(FastifyVite, {
  root: path.join(import.meta.url, "../../../"),
  dev: process.argv.includes("--dev"),
  spa: true,
});
const logger = RidiLogger.init({
  service: "map-preview",
});

const s = initServer();

const router = s.router(mapPreviewContract, {
  createPreview: async ({ body }) => {
    let stuff = "";
    try {
      stuff = await handleMapPreviewRequest();
    } catch (error) {
      logger.error("error on puppeteer", { error });
    }
    if (body.type === "route") {
      return {
        status: 200,
        body: {
          url: stuff,
        },
      };
    }
    if (body.type === "plan") {
      return {
        status: 200,
        body: {
          url: stuff,
        },
      };
    }
    return {
      status: 500,
      body: {
        message: "Unknown preview type",
      },
    };
  },
  healthcheck: async () => {
    return {
      status: 200,
      body: {
        running: true,
      },
    };
  },
});

server.get("/", (_req, reply) => {
  return reply.html();
});

server.register(s.plugin(router));

await server.vite.ready();
logger.info("Listening", { port: env.PORT });
await server.listen({ port: env.PORT, host: "0.0.0.0" });
