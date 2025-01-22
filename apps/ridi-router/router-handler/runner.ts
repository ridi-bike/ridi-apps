import { getDb, pg } from "@ridi-router/lib";
import { Messaging } from "@ridi-router/messaging/main.ts";
import { RidiLogger } from "@ridi-router/logging/main.ts";
import { EnvVariables } from "./env-variables.ts";
import { PgClient } from "./pg-client.ts";
import { PlanProcessor } from "./plan-processor.ts";

export class Runner {
  constructor(
    private readonly env: EnvVariables,
    private readonly logger: RidiLogger,
    private readonly db: ReturnType<typeof getDb>,
    private readonly pgClient: PgClient,
    private readonly pgQueries: typeof pg,
    private readonly messaging: Messaging,
    private readonly planProcessor: PlanProcessor,
  ) {
  }

  async start() {
    this.logger.debug("Start triggered");

    const handlerRecord = this.db.handlers.get("router");

    if (handlerRecord?.router_version !== this.env.routerVersion) {
      this.db.handlers.createUpdate("router", this.env.routerVersion);

      this.logger.debug("New router version", {
        old: handlerRecord?.router_version,
        new: this.env.routerVersion,
      });
    }
    const nextMapData = this.db.mapData.getRecordsAllNext();
    if (nextMapData.length) {
      this.logger.debug("Next records found", {
        regions: nextMapData.map((r) => r.region),
      });
      if (
        !nextMapData.every((r) => r.router_version === this.env.routerVersion)
      ) {
        this.logger.error(
          "Some 'next' map data records do not have the correct router version",
          { routerVersion: this.env.routerVersion, nextMapData },
        );
        throw new Error("Critical failure");
      }

      const allNext = this.db.mapData.getRecordsAllNext();
      if (allNext.every((rec) => rec.status === "ready")) {
        this.logger.info("All next records are ready, promoting", { allNext });
        this.db.mapData.updateRecordsDemoteCurrent();

        this.db.mapData.updateRecordsPromoteNext();

        await this.pgQueries.regionSetAllPrevious(this.pgClient);
        for (const nextRec of nextMapData) {
          await this.pgQueries.regionSetCurrent(this.pgClient, {
            region: nextRec.region,
            pbfMd5: nextRec.pbf_md5,
          });
        }
      } else {
        this.logger.info("Not all next records are ready, promotion skipped", {
          allNext,
        });
      }
    }

    const currentMapData = this.db.mapData.getRecordsAllCurrent();
    if (currentMapData.length) {
      this.logger.debug("Current records found", {
        regions: currentMapData.map((r) => r.region),
      });
      if (
        !currentMapData.every((r) =>
          r.router_version === this.env.routerVersion
        )
      ) {
        throw this.logger.error(
          "Some 'current' map data records do not have the correct router version",
          { routerVersion: this.env.routerVersion, nextMapData },
        );
      }
    } else {
      throw this.logger.error("No map data records found, critical failure");
    }

    this.messaging.listen(
      "new-plan",
      async (
        { message, data, actions: { deleteMessage, setVisibilityTimeout } },
      ) => {
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
          if (message.readCt < 600) {
            const retryInSecs = 30;
            this.logger.error("New Plan message error, retry", {
              message,
              data,
              retryInSecs,
              err,
            });
            await setVisibilityTimeout(retryInSecs);
          } else {
            this.logger.error("New Plan message error", {
              message,
              data,
            });
            await deleteMessage();
          }
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
