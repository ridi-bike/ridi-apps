import { type RidiLogger } from "@ridi/logger";
import type postgres from "postgres";

import {
  archiveMessage,
  deleteMessage,
  readMessages,
  type ReadMessagesWithLongPollRow,
  sendMessage,
  updateVisibilityTimeout,
} from "./messaging_sql.ts";

type Messages = {
  plan_map_gen: { planId: string };
  route_map_gen: { routeId: string };
  plan_new: { planId: string };
};

type MessageHandler<
  TName extends keyof Messages,
  TData extends Messages[TName],
> = (args: {
  message: ReadMessagesWithLongPollRow;
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

  listen<TName extends keyof Messages>(
    queueName: TName,
    messageHandler: MessageHandler<TName, Messages[TName]>,
  ) {
    this.runListener(queueName, messageHandler).catch((error) => {
      this.stopped = true;
      this.logger.error("Error in message listener", {
        error,
      });
    });
  }
  private async runListener<TName extends keyof Messages>(
    queueName: TName,
    messageHandler: MessageHandler<TName, Messages[TName]>,
  ) {
    while (!this.stopped) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));

      const messages = await readMessages(this.db, {
        queueName,
        visibilityTimeoutSeconds: 5,
        qty: 10,
      });

      messages.forEach((message) =>
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
      );
    }
  }

  isRunning() {
    return !this.stopped;
  }

  stop() {
    this.stopped = true;
  }
}
