import { createServer } from "http";

import { RidiLogger } from "@ridi/logger";
import { Messaging } from "@ridi/messaging";
import postgres from "postgres";

import { env } from "./env.ts";
import { MapPreviewServiceClient } from "./map-preview-service-client.ts";
import { MessageHandlerNewPlan } from "./message-handler-new-plan.ts";
import { RouterServiceLookup } from "./router-service-lookup.ts";

const pgClient = postgres(env.SUPABASE_DB_URL);

const logger = RidiLogger.init({ service: "queue-service" });

const messaging = new Messaging(pgClient, logger);
const messageHandlerNewPlan = new MessageHandlerNewPlan(
  logger,
  pgClient,
  new RouterServiceLookup(logger),
  new MapPreviewServiceClient(logger),
);

messaging.listen(
  "new-plan",
  async ({
    message,
    data,
    actions: { deleteMessage, setVisibilityTimeout },
  }) => {
    const beat = setInterval(() => setVisibilityTimeout(5), 4000);
    try {
      await messageHandlerNewPlan.handleNewPlan(data.planId);
      await deleteMessage();
    } catch (err) {
      const retryInSecs = 30;
      logger.error("New Plan message error, retry", {
        message,
        data,
        retryInSecs,
        err,
      });
      await setVisibilityTimeout(retryInSecs);
      messageHandlerNewPlan.onNewPlanError(data.planId);
    }
    clearInterval(beat);
  },
);

const handleExit = () => {
  messaging.stop();
};
// do something when app is closing
process.on("exit", handleExit);
// catches ctrl+c event
process.on("SIGINT", handleExit);
// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", handleExit);
process.on("SIGUSR2", handleExit);
// catches uncaught exceptions
process.on("uncaughtException", (error, origin) => {
  logger.error("uncaughtException", { error, origin });
  process.exit();
});
process.on("unhandledRejection", (reason, promise) => {
  logger.error("unhandledRejection", { reason, promise });
  process.exit();
});

const server = createServer(async (_req, res) => {
  try {
    if (messaging.isRunning()) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Hello, world");
    } else {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          messagingRunning: messaging.isRunning(),
        }),
      );
    }
  } catch (error) {
    logger.error("Error on healthcheck", { error });
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
});

server.listen(3000, "0.0.0.0", () => {
  logger.info(`Server running at http://0.0.0.0:${3000}/`);
});
