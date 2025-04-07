import { createServer } from "http";

import { RidiLogger } from "@ridi/logger";
import { type MessageHandler, Messaging, type Messages } from "@ridi/messaging";
import postgres from "postgres";

import { env } from "./env.ts";
import { MapPreviewServiceClient } from "./map-preview-service-client.ts";
import { MessageHandlerMapPreview } from "./message-handler-map-preview.ts";
import { MessageHandlerNewPlan } from "./message-handler-new-plan.ts";
import { RouterServiceLookup } from "./router-service-lookup.ts";

const pgClient = postgres(env.SUPABASE_DB_URL);

const logger = RidiLogger.init({ service: "queue-service" });

const messaging = new Messaging(pgClient, logger);
const messageHandlerNewPlan = new MessageHandlerNewPlan(
  logger,
  pgClient,
  new RouterServiceLookup(logger),
  messaging,
);
const messageHandlerMapPreview = new MessageHandlerMapPreview(
  logger,
  pgClient,
  new MapPreviewServiceClient(logger),
);

const MAX_RETRY_COUNT = 10;

function constructMessageHandler<
  TName extends keyof Messages,
  TData extends Messages[TName],
>(
  queueName: TName,
  messageDataHandler: (data: TData) => Promise<void>,
  onFailure?: (data: TData) => Promise<void>,
  onSuccess?: (data: TData) => Promise<void>,
): MessageHandler<TName, TData> {
  return async ({
    message,
    data,
    actions: { deleteMessage, setVisibilityTimeout, archiveMessage },
  }) => {
    logger.info("Message received", { queueName, message, data });
    const beat = setInterval(() => setVisibilityTimeout(10), 8000);
    try {
      await messageDataHandler(data);
      await deleteMessage();
      if (onSuccess) {
        await onSuccess(data);
      }
      logger.info("Message successfully processed", {
        queueName,
        message,
        data,
      });
    } catch (err) {
      if (message.readCt <= MAX_RETRY_COUNT) {
        const retryInSecs = 15 * message.readCt;
        logger.error("Message failure, retry", {
          queueName,
          message,
          data,
          retryInSecs,
          err,
        });
        await setVisibilityTimeout(retryInSecs);
      } else {
        logger.error("Message failure, archiving", {
          queueName,
          message,
          data,
          err,
        });
        await archiveMessage();
      }
      if (onFailure) {
        await onFailure(data);
      }
    }
    clearInterval(beat);
  };
}

messaging.listen(
  "plan_map_gen",
  constructMessageHandler("plan_map_gen", (data) =>
    messageHandlerMapPreview.handlePlanMapPreview(data.planId),
  ),
);
messaging.listen(
  "route_map_gen",
  constructMessageHandler("route_map_gen", (data) =>
    messageHandlerMapPreview.handleRouteMapPreview(data.routeId),
  ),
);
messaging.listen(
  "plan_new",
  constructMessageHandler(
    "plan_new",
    (data) => messageHandlerNewPlan.handleNewPlan(data.planId),
    (data) => messageHandlerNewPlan.onNewPlanError(data.planId),
  ),
);

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
