import { type RidiLogger } from "@ridi/logger";
import type postgres from "postgres";
import type z from "zod";

import {
  archiveMessage,
  deleteMessage,
  readMessages,
  sendMessage,
  updateVisibilityTimeout,
  type ReadMessagesRow,
} from "./messaging_sql.ts";
import { notifyPayloadSchema } from "./notify.ts";

export { notifyPayloadSchema };

export type Messages = {
  plan_map_gen: { planId: string };
  route_map_gen: { routeId: string };
  plan_new: { planId: string; widerRetryNum?: number };
  user_new: { userId: string };
  data_sync_notify: z.infer<typeof notifyPayloadSchema>;
};

export type MessageHandler<
  TName extends keyof Messages,
  TData extends Messages[TName],
> = (args: {
  message: ReadMessagesRow;
  data: TData;
  actions: {
    deleteMessage: () => Promise<void>;
    archiveMessage: () => Promise<void>;
    setVisibilityTimeout: (visibilityTimeoutSecs: number) => Promise<void>;
  };
}) => Promise<void>;

export class Messaging {
  private stopped = false;

  private readonly db: ReturnType<typeof postgres>;
  private readonly logger: RidiLogger;

  constructor(db: ReturnType<typeof postgres>, logger: RidiLogger) {
    this.db = db;
    this.logger = logger.withContext({ module: "messaging" });
  }

  async send<TName extends keyof Messages>(
    queueName: TName,
    message: Messages[TName],
  ) {
    await sendMessage(this.db, { queueName, message });
  }

  async listen<TName extends keyof Messages>(
    queueName: TName,
    messageHandler: MessageHandler<TName, Messages[TName]>,
    concurrencyLimit: number | null,
  ) {
    while (!this.stopped) {
      const messages = await readMessages(this.db, {
        queueName,
        visibilityTimeoutSeconds: 10,
        qty: concurrencyLimit || 100,
        maxPollSeconds: 90_000, // 1,5 min
        pollIntervalMs: 100,
      });

      const messagePromises = Promise.allSettled(
        messages.map((message) =>
          messageHandler({
            message,
            data: message.message,
            actions: {
              deleteMessage: async () => {
                this.logger.info("Message delete called", { message });
                await deleteMessage(this.db, {
                  queueName,
                  messageId: message.msgId,
                });
              },
              archiveMessage: async () => {
                this.logger.info("Message archive called", { message });
                await archiveMessage(this.db, {
                  queueName,
                  messageId: message.msgId,
                });
              },
              setVisibilityTimeout: async (vt) => {
                this.logger.info("Message visisvility timeout update called", {
                  message,
                });
                await updateVisibilityTimeout(this.db, {
                  queueName,
                  messageId: message.msgId,
                  visibilityTimeoutSeconds: vt,
                });
              },
            },
          })
            .then(() => this.logger.info("Message processed", { message }))
            .catch((error) =>
              this.logger.error("Failed to process message unexpectedly", {
                message,
                error,
              }),
            ),
        ),
      );
      if (concurrencyLimit) {
        await messagePromises;
      }
    }
  }

  isRunning() {
    return !this.stopped;
  }

  stop() {
    this.stopped = true;
  }
}
