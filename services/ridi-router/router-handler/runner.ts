import { pg, PgClient } from "@ridi-router/lib";
import { Messaging } from "@ridi-router/messaging/main.ts";
import { RidiLogger } from "@ridi-router/logging/main.ts";
import { EnvVariables } from "./env-variables.ts";
import { PlanProcessor } from "./plan-processor.ts";

export class Runner {
  constructor(
    private readonly env: EnvVariables,
    private readonly logger: RidiLogger,
    private readonly pgClient: PgClient,
    private readonly pgQueries: typeof pg,
    private readonly messaging: Messaging,
    private readonly planProcessor: PlanProcessor,
  ) {}

  public listen() {
    this.messaging.listen(
      "new-plan",
      async ({
        message,
        data,
        actions: { deleteMessage, setVisibilityTimeout },
      }) => {
        const beat = setInterval(() => setVisibilityTimeout(5), 4000);
        try {
          const retryIn = await this.planProcessor.handlePlanNotification(
            data.planId,
          );
          if (retryIn) {
            await setVisibilityTimeout(retryIn);
          } else {
            await deleteMessage();
          }
        } catch (err) {
          const retryInSecs = 30;
          this.logger.error("New Plan message error, retry", {
            message,
            data,
            retryInSecs,
            err,
          });
          await setVisibilityTimeout(retryInSecs);
          await this.pgQueries.planSetState(this.pgClient, {
            id: data.planId,
            state: "error",
          });
        }
        clearInterval(beat);
      },
    );

    globalThis.addEventListener("unload", () => {
      this.messaging.stop();
    });

    Deno.serve(
      { port: Number(this.env.port), hostname: "0.0.0.0" },
      async (_req) => {
        const regionCount = await this.pgQueries.regionGetCount(this.pgClient);
        if (this.messaging.isRunning() && regionCount?.count) {
          return new Response("Hello, world");
        }
        return new Response(
          JSON.stringify({
            messagingRunning: this.messaging.isRunning(),
            regionCount: regionCount?.count,
          }),
          {
            status: 500,
          },
        );
      },
    );
  }
}
