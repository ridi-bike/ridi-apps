import { userGetAllIds } from "@ridi/db-queries";
import { type RidiLogger } from "@ridi/logger";
import { type notifyPayloadSchema } from "@ridi/messaging";
import axios from "axios";
import type postgres from "postgres";
import type z from "zod";

import { env } from "./env";

export class MessageHandlerDataSyncNotify {
  private readonly logger: RidiLogger;
  private readonly pgClient: postgres.Sql;

  constructor(logger: RidiLogger, pgClient: postgres.Sql) {
    this.logger = logger.withContext({ module: "message-handler-user-new" });
    this.pgClient = pgClient;
  }

  async handleDataSyncNotify(payload: z.infer<typeof notifyPayloadSchema>) {
    if (payload.table === "regions") {
      const userIds = await userGetAllIds(this.pgClient);
      for (const userId of userIds) {
        await this.publishUpdate(userId.id, payload);
      }
    } else {
      const userId = (payload.record || payload.old_record).userId;
      if (typeof userId !== "string") {
        throw this.logger.error("Unexpected type for userId field in record.", {
          userId,
          record: payload.record,
          oldRecord: payload.old_record,
        });
      }
      await this.publishUpdate(userId, payload);
    }
  }

  private async publishUpdate(
    userId: string,
    payload: z.infer<typeof notifyPayloadSchema>,
  ) {
    const syncUrl = `${env.API_URL}/sync/${userId}`;
    await axios.request({
      url: syncUrl,
      method: "post",
      data: payload,
      params: {
        action: "notify",
      },
    });
  }
}
