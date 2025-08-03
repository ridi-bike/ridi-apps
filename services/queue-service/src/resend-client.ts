import { Resend } from "resend";

import { env } from "./env";

export class ResendClient {
  private readonly resendApi = new Resend(env.RESEND_SECRET);

  public async addUser(email: string) {
    await this.resendApi.contacts.create({
      audienceId: env.RESEND_AUDIENCE_ID,
      email: email,
    });
  }
}
