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

  async start() {
    this.logger.info("Start triggered");

    const handlerRecord = await this.pgQueries.servicesGet(this.pgClient, {
      name: "router",
    });

    if (handlerRecord?.routerVersion !== this.env.routerVersion) {
      await this.pgQueries.servicesCreateUpdate(this.pgClient, {
        name: "router",
        routerVersion: this.env.routerVersion,
      });

      this.logger.info("New router version", {
        old: handlerRecord?.routerVersion,
        new: this.env.routerVersion,
      });
    }

    const nextMapData = await this.pgQueries.mapDataGetRecordsAllNext(
      this.pgClient,
    );

    if (
      this.env.regions.every(
        (region) =>
          nextMapData.find((mapData) => mapData.region === region)?.status ===
          "ready",
      )
    ) {
      this.logger.info("Next records found", {
        regions: nextMapData.map((r) => r.region),
      });
      if (
        !nextMapData.every((r) => r.routerVersion === this.env.routerVersion)
      ) {
        this.logger.error(
          "Some 'next' map data records do not have the correct router version",
          {
            routerVersion: this.env.routerVersion,
            nextMapData: nextMapData.map((n) => ({
              id: n.id,
              routerVersion: n.routerVersion,
              region: n.region,
            })),
          },
        );
        throw new Error("Critical failure");
      }

      const allNext = await this.pgQueries.mapDataGetRecordsAllCurrent(
        this.pgClient,
      );
      if (allNext.every((rec) => rec.status === "ready")) {
        this.logger.info("All next records are ready, promoting", { allNext });
        await this.pgQueries.mapDataUpdateRecordsDemoteCurrent(this.pgClient);

        await this.pgQueries.mapDataUpdateRecordsPromoteNext(this.pgClient);

        await this.pgQueries.regionSetAllPrevious(this.pgClient);
        for (const nextRec of nextMapData) {
          await this.pgQueries.regionSetCurrent(this.pgClient, {
            region: nextRec.region,
            pbfMd5: nextRec.pbfMd5,
          });
        }
      } else {
        this.logger.info("Not all next records are ready, promotion skipped", {
          allNext: allNext.map((r) => ({
            id: r.id,
            region: r.region,
            routerVersion: r.routerVersion,
          })),
        });
      }
    }

    const currentMapData = await this.pgQueries.mapDataGetRecordsAllCurrent(
      this.pgClient,
    );
    const currentRegions = await this.pgQueries.regionGetAllCurrent(
      this.pgClient,
    );
    if (
      this.env.regions.every((region) => {
        const mapData = currentMapData.find(
          (mapData) => mapData.region === region,
        );
        return (
          mapData?.status === "ready" &&
          currentRegions.find((reg) => reg.region === region)?.pbfMd5 ===
            mapData.pbfMd5
        );
      })
    ) {
      this.logger.info("Current records found", {
        regions: currentMapData.map((r) => r.region),
      });
      if (
        !currentMapData.every((r) => r.routerVersion === this.env.routerVersion)
      ) {
        throw this.logger.error(
          "Some 'current' map data records do not have the correct router version",
          {
            routerVersion: this.env.routerVersion,
            nextMapData: currentMapData
              .filter((r) => r.routerVersion !== this.env.routerVersion)
              .map((r) => ({
                routerVersion: r.routerVersion,
                id: r.id,
                region: r.region,
              })),
          },
        );
      }
    } else {
      throw this.logger.error(
        "Map data or region records not found, critical failure",
        {
          regions: this.env.regions,
          currentMapData: currentMapData.map((r) => ({
            id: r.id,
            routerVersion: r.routerVersion,
            region: r.region,
          })),
          currentRegions: currentRegions.map((r) => ({
            id: r.id,
            pbfMd5: r.pbfMd5,
            region: r.region,
          })),
        },
      );
    }

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
          if (message.readCt < 6) {
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
