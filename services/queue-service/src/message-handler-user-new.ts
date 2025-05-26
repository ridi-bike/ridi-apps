import { userGet } from "@ridi/db-queries";
import { type RidiLogger } from "@ridi/logger";
import type postgres from "postgres";

import { type ResendClient } from "./resend-client";

export class MessageHandlerUserNew {
  private readonly logger: RidiLogger;
  private readonly pgClient: postgres.Sql;
  private readonly resendClient: ResendClient;

  constructor(
    logger: RidiLogger,
    pgClient: postgres.Sql,
    resendClient: ResendClient,
  ) {
    this.logger = logger.withContext({ module: "message-handler-user-new" });
    this.pgClient = pgClient;
    this.resendClient = resendClient;
  }

  async handleUserNew(userId: string) {
    const user = await userGet(this.pgClient, { userId });
    if (!user?.email) {
      return;
    }
    this.logger.info("Handling new user", { userId });

    const { email } = user;

    await this.resendClient.addUser(email);
    this.logger.info("User created in resend", { userId });
  }
}
