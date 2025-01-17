import type postgres from "postgres";
import {
  archiveMessage,
  deleteMessage,
  pollMessages,
  sendMessage,
} from "./messaging_sql.ts";

type Messages = {
  "net-addr-activity": { netAddr: string };
  "coords-activty": { lat: string; lon: string };
  "new-plan": { planId: string };
};

export class Messaging {
  private readonly pollingIntervals: number[] = [];
  constructor(
    readonly db: ReturnType<typeof postgres>,
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
    visibilityTimeoutSeconds: number,
    archive: boolean,
    listener: (messageId: number, message: Messages[TName]) => Promise<void>,
  ) {
    this.pollingIntervals.push(setInterval(async () => {
      let messages: Awaited<ReturnType<typeof pollMessages>> | null = null;
      do {
        messages = await pollMessages(this.db, {
          queueName,
          visibilityTimeoutSeconds,
          qty: 100,
        });
        messages.forEach(async (message) => {
          await listener(message.msgId, message.message);
          if (archive) {
            await archiveMessage(this.db, {
              queueName,
              messageId: message.msgId,
            });
          } else {
            await deleteMessage(this.db, {
              queueName,
              messageId: message.msgId,
            });
          }
        });
      } while (messages.length > 0);
    }, 1000));
  }

  close() {
    for (const interval of this.pollingIntervals) {
      clearInterval(interval);
    }
  }
}
