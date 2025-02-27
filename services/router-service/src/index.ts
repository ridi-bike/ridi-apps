import { RidiLogger } from "@ridi/logger";
import { type respSchema } from "@ridi/router-service-contracts";
import { ridiRouterContract } from "@ridi/router-service-contracts";
import { initServer } from "@ts-rest/fastify";
import Fastify from "fastify";
import { type z } from "zod";

import { env } from "./env.ts";
import {
  RouterClient,
  type RidiRouterErr,
  type RidiRouterOk,
} from "./router-client.ts";
import { RouterServer } from "./router-server.ts";

const logger = RidiLogger.init({
  service: "ridi-router",
  region: env.REGION,
  routerVersion: env.ROUTER_VERSION,
});

const app = Fastify();

const s = initServer();

const routerServer = new RouterServer(logger);

const router = s.router(ridiRouterContract, {
  generateRoute: async ({ body }) => {
    if (routerServer.getState() !== "running") {
      return {
        status: 400,
        body: {
          message: "router not ready",
        },
      };
    }

    const client = new RouterClient(logger, body);

    const result = await client.execReq();

    if ((result.result as RidiRouterErr).err) {
      const err = (result.result as RidiRouterErr).err;
      return {
        status: 500,
        body: {
          message: `Error from router: ${err}`,
        },
      };
    }
    const okResult = result.result as RidiRouterOk;

    const respBody: z.infer<typeof respSchema> = {
      reqId: body.reqId,
      routes: okResult.ok.routes.map((r) => ({
        route: r.coords,
        stats: {
          lenM: r.stats.len_m,
          score: r.stats.score,
          junctionCount: r.stats.junction_count,
          breakdown: [
            ...Object.entries(r.stats.highway).map(([statName, val]) => ({
              statType: "type" as const,
              statName,
              lenM: val.len_m,
              percentage: val.percentage,
            })),

            ...Object.entries(r.stats.surface).map(([statName, val]) => ({
              statType: "surface" as const,
              statName,
              lenM: val.len_m,
              percentage: val.percentage,
            })),

            ...Object.entries(r.stats.smoothness).map(([statName, val]) => ({
              statType: "smoothness" as const,
              statName,
              lenM: val.len_m,
              percentage: val.percentage,
            })),
          ],
        },
      })),
    };

    return {
      status: 200,
      body: respBody,
    };
  },
  healthcheck: async () => {
    return {
      status: routerServer.getState() === "running" ? 200 : 500,
      body: {
        routerVersion: env.ROUTER_VERSION,
        running: routerServer.getState() === "running",
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
const handleExit = () => {
  routerServer.stopServer();
};
// do something when app is closing
process.on("exit", handleExit);
// catches ctrl+c event
process.on("SIGINT", handleExit);
// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", handleExit);
process.on("SIGUSR2", handleExit);
process.on("uncaughtException", (error, origin) => {
  logger.error("uncaughtException", { error, origin });
});
process.on("unhandledRejection", (reason, promise) => {
  logger.error("unhandledRejection", { reason, promise });
});

start();
