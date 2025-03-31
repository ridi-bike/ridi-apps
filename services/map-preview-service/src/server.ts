import path from "node:path";

import FastifyVite from "@fastify/vite";
import { RidiLogger } from "@ridi/logger";
import { mapPreviewContract } from "@ridi/map-preview-service-contracts";
import { initServer } from "@ts-rest/fastify";
import Fastify from "fastify";

import { env } from "./server/env.ts";
import { MapPreviewGenerator } from "./server/map-preview-generator.ts";
import { R2Client } from "./server/r2-client.ts";

const server = Fastify();

await server.register(FastifyVite, {
  root: path.resolve(import.meta.dirname, "../"),
  dev: process.argv.includes("--dev"),
  spa: true,
});
const logger = RidiLogger.init({
  service: "map-preview",
});

const s = initServer();

const previewGenerator = new MapPreviewGenerator(logger);
previewGenerator
  .init()
  .catch((error) => logger.error("Error on browser init", { error }));
const r2Client = new R2Client(logger);

const router = s.router(mapPreviewContract, {
  createPreview: async ({ body }) => {
    logger.info("Map preview call", { reqId: body.reqId });
    try {
      const imageData = await previewGenerator.generatePreview(body);
      const imageUrl = await r2Client.uploadPreview(body.reqId, imageData);
      return {
        status: 200,
        body: {
          url: imageUrl,
        },
      };
    } catch (error) {
      logger.error("Error while capturing preview", {
        error,
        reqId: body.reqId,
      });
      return {
        status: 500,
        body: {
          message: "Error while generating preview",
        },
      };
    }
  },
  healthcheck: async () => {
    return {
      status: previewGenerator.getState() === "running" ? 200 : 500,
      body: {
        running: previewGenerator.getState() === "running",
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
