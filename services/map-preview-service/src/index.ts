import { RidiLogger } from "@ridi/logger";
import { mapPreviewContract } from "@ridi/map-preview-service-contracts";
import { initServer } from "@ts-rest/fastify";
import Fastify from "fastify";

import { env } from "./env.ts";
import { handleMapPreviewRequest } from "./map-preview.ts";

const logger = RidiLogger.init({
  service: "map-preview",
});

const app = Fastify();

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

app.register(s.plugin(router));

const start = async () => {
  try {
    logger.info("Healthcheck listening", { port: env.PORT });
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("uncaughtException", (error, origin) => {
  logger.error("uncaughtException", { error, origin });
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  logger.error("unhandledRejection", { reason, promise });
  process.exit(1);
});

start();
