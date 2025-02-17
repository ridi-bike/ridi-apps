import type postgres from "postgres/mod.js";
import {
  archiveMessage,
  deleteMessage,
  readMessagesWithLongPoll,
  type ReadMessagesWithLongPollRow,
  sendMessage,
  updateVisibilityTimeout,
} from "./messaging_sql.ts";

type MessageHandler<TName extends keyof Messages> = (args: {
  message: ReadMessagesWithLongPollRow;
  data: Messages[TName];
  actions: {
    deleteMessage: () => Promise<void>;
    archiveMessage: () => Promise<void>;
    setVisibilityTimeout: (
      visibilityTimeoutSecs: number,
    ) => Promise<void>;
  };
}) => Promise<void>;

type Messages = {
  "net-addr-activity": { netAddr: string };
  "coords-activty": { lat: string; lon: string };
  "new-plan": { planId: string };
};

interface Logger {
  info(message: string, properties?: Record<string, unknown>): void;
  error(message: string, properties?: Record<string, unknown>): void;
}

export class Messaging {
  private stopped = false;

  constructor(
    readonly db: ReturnType<typeof postgres>,
    private readonly logger: Logger,
  ) {
  }

  async send<TName extends keyof Messages>(
    queueName: TName,
    message: Messages[TName],
  ) {
    await sendMessage(this.db, { queueName, message });
  }

  listen<TName extends keyof Messages>(
    queueName: TName,
    messageHandler: MessageHandler<TName>,
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
    messageHandler: MessageHandler<TName>,
  ) {
    while (!this.stopped) {
      const messages = await readMessagesWithLongPoll(this.db, {
        queueName,
        visibilityTimeoutSeconds: 5,
        qty: 100,
        internalPollMs: 200,
        maxPollSeconds: 60,
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
        }).then(() => this.logger.info("Message processed", { message })).catch(
          (error) =>
            this.logger.error("Failed to process message unexpectedly", {
              message,
              error,
            }),
        )
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
